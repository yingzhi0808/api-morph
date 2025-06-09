import type { Project, SourceFile } from "ts-morph";
import { SyntaxKind } from "typescript";
import { ExpressRouteAnalyzer } from "@/analyzers";
import { type OpenAPIBuilder, PathItemBuilder } from "@/builders";
import { JSDocTagName } from "@/constants";
import {
  CallbackTagParser,
  DeprecatedTagParser,
  DescriptionTagParser,
  ExtensionsTagParser,
  ExternalDocsTagParser,
  OperationIdTagParser,
  OperationTagParser,
  ParameterTagParser,
  RequestBodyTagParser,
  ResponsesExtensionsTagParser,
  ResponseTagParser,
  SecurityTagParser,
  ServerTagParser,
  SimplifiedResponseTagParser,
  SummaryTagParser,
  TagsTagParser,
} from "@/parsers";
import type { ParseContext, ParsedOperation, ParserOptions, SourceOperationData } from "@/types";
import { ASTAnalyzerRegistry } from "./ASTAnalyzerRegistry";
import { OperationComposer } from "./OperationComposer";
import { TagParserRegistry } from "./TagParserRegistry";

/**
 * 解析整个项目中的 JSDoc 注释，并生成 OpenAPI 对象
 */
export class OpenAPIParser {
  /** 解析上下文 */
  private context: ParseContext;
  /** 标签解析器注册表 */
  private tagParserRegistry: TagParserRegistry;
  /** AST分析器注册表 */
  private astAnalyzerRegistry: ASTAnalyzerRegistry;

  constructor(
    private project: Project,
    private options: ParserOptions = {},
  ) {
    this.context = this.createParseContext(this.project, options);
    this.tagParserRegistry = this.createTagParserRegistry(this.options);
    this.astAnalyzerRegistry = this.createASTAnalyzerRegistry(this.options);
  }

  /**
   * 解析整个项目，返回完整的 OpenAPI 对象。
   * @param openAPIBuilder 文档构建器实例。
   * @returns 返回完整的 OpenAPI 对象。
   */
  async parse(openAPIBuilder: OpenAPIBuilder) {
    const operationParser = new OperationComposer(this.tagParserRegistry, this.astAnalyzerRegistry);

    const include = this.context.options.include;
    const excludes = this.context.options.exclude;

    let sourceFiles: SourceFile[];
    if (Array.isArray(include)) {
      if (include.length === 0) {
        sourceFiles = this.project.getSourceFiles([]);
      } else {
        const patterns = [...include];
        if (Array.isArray(excludes) && excludes.length > 0) {
          patterns.push(...excludes.map((pattern) => `!${pattern}`));
        }
        sourceFiles = this.project.getSourceFiles(patterns);
      }
    } else if (Array.isArray(excludes) && excludes.length > 0) {
      const patterns: string[] = excludes.map((pattern) => `!${pattern}`);
      sourceFiles = this.project.getSourceFiles(patterns);
    } else {
      sourceFiles = this.project.getSourceFiles();
    }

    const flatOperationDataList = sourceFiles.flatMap((sourceFile) =>
      this.findSourceOperationDataList(sourceFile),
    );

    const results = await Promise.all(
      flatOperationDataList.map((sourceOperationData) =>
        operationParser.compose(sourceOperationData),
      ),
    );

    const filteredResults = this.filterDeprecatedOperations(results);
    const openAPIObject = this.buildOpenAPI(filteredResults, openAPIBuilder);
    return openAPIObject;
  }

  /**
   * 根据 includeDeprecated 选项过滤废弃的操作。
   * @param parsedOperationList 解析得到的操作数组。
   * @returns 过滤后的操作数组。
   */
  private filterDeprecatedOperations(parsedOperationList: ParsedOperation[]): ParsedOperation[] {
    if (this.context.options.includeDeprecated) {
      return parsedOperationList;
    }
    return parsedOperationList.filter(
      (parsedOperationData) => !parsedOperationData.operation.deprecated,
    );
  }

  /**
   * 构建完整的 OpenAPI 文档。
   * @param parsedOperationList 解析得到的操作数组。
   * @param openAPIBuilder 预构建文档构建器实例。
   * @returns OpenAPI 文档对象。
   */
  private buildOpenAPI(parsedOperationList: ParsedOperation[], openAPIBuilder: OpenAPIBuilder) {
    // 直接使用传入的 OpenAPIBuilder 实例
    const builder = openAPIBuilder;

    const tags = new Set<string>();
    const pathItemBuilders = new Map<string, PathItemBuilder>();

    for (const parsedOperationData of parsedOperationList) {
      const { path, method, operation } = parsedOperationData;

      let pathItemBuilder = pathItemBuilders.get(path);
      if (!pathItemBuilder) {
        pathItemBuilder = new PathItemBuilder();
        pathItemBuilders.set(path, pathItemBuilder);
      }

      pathItemBuilder.addOperation(method, operation);

      if (operation.tags) {
        operation.tags.forEach((tag) => tags.add(tag));
      }
    }

    for (const [path, pathItemBuilder] of pathItemBuilders.entries()) {
      builder.addPathItemFromBuilder(path, pathItemBuilder);
    }

    tags.forEach((tag) => {
      builder.addTag({ name: tag });
    });

    for (const [name, schema] of this.context.schemas) {
      builder.addSchemaToComponents(name, schema);
    }

    return builder.build();
  }

  /**
   * 创建标签解析器注册表。
   * @param options 配置选项。
   * @returns 标签解析器注册表。
   */
  private createTagParserRegistry(options: ParserOptions) {
    const tagParserRegistry = new TagParserRegistry();
    const defaultParsers = [
      SecurityTagParser,
      ServerTagParser,
      ParameterTagParser,
      RequestBodyTagParser,
      ResponseTagParser,
      CallbackTagParser,
      ExternalDocsTagParser,
      OperationIdTagParser,
      DeprecatedTagParser,
      ExtensionsTagParser,
      ResponsesExtensionsTagParser,
      DescriptionTagParser,
      SummaryTagParser,
      TagsTagParser,
      OperationTagParser,
      SimplifiedResponseTagParser,
    ];
    const parsers = [...defaultParsers, ...(options.customParsers ?? [])];

    for (const parser of parsers) {
      tagParserRegistry.register(new parser(this.context));
    }

    return tagParserRegistry;
  }

  /**
   * 创建AST分析器注册表。
   * @param options 配置选项。
   * @returns AST分析器注册表。
   */
  private createASTAnalyzerRegistry(options: ParserOptions) {
    const astAnalyzerRegistry = new ASTAnalyzerRegistry();

    // 如果禁用了AST分析，返回空的注册表
    if (options.enableASTAnalysis === false) {
      return astAnalyzerRegistry;
    }

    const defaultAnalyzers = [ExpressRouteAnalyzer];
    const analyzers = [...defaultAnalyzers, ...(options.customAnalyzers ?? [])];

    for (const analyzer of analyzers) {
      astAnalyzerRegistry.register(new analyzer(this.context));
    }

    return astAnalyzerRegistry;
  }

  /**
   * 创建解析上下文。
   * @param project ts-morph Project 实例。
   * @param parserOptions 自定义解析选项。
   * @returns 解析上下文实例。
   */
  private createParseContext(project: Project, parserOptions: ParserOptions): ParseContext {
    const typeChecker = project.getTypeChecker();

    // 默认选项
    const defaultOptions: ParserOptions = {
      includeDeprecated: true,
      defaultResponseMediaType: "application/json",
      defaultRequestMediaType: "application/json",
      enableASTAnalysis: true,
    };

    // 合并用户选项和默认选项
    const options: ParserOptions = { ...defaultOptions, ...parserOptions };

    return {
      project,
      typeChecker,
      schemas: new Map(),
      options,
    };
  }

  /**
   * 查找指定 TypeScript 文件中所有被 @operation 标签注释的 AST 节点。
   * @param sourceFile 要解析的 TypeScript 源文件。
   * @returns 返回一个 SourceOperationData 数组，其中每个对象包含被 JSDoc 标签注释的 AST 节点及其所有标签，
   * 如果未找到匹配的节点，则返回空数组。
   */
  private findSourceOperationDataList(sourceFile: SourceFile) {
    const jsDocNodes = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc);
    const sourceOperationDataList: SourceOperationData[] = [];

    for (const jsDocNode of jsDocNodes) {
      const tags = jsDocNode.getTags();

      // 检查是否包含 @operation 标签
      const hasOperation = tags.some((tag) => tag.getTagName() === JSDocTagName.OPERATION);
      if (!hasOperation) {
        continue;
      }

      // 检查是否包含 @hidden 标签，如果有则跳过此操作
      const isHidden = tags.some((tag) => tag.getTagName() === JSDocTagName.HIDDEN);
      if (isHidden) {
        continue;
      }

      const parentNode = jsDocNode.getParent();
      if (parentNode) {
        sourceOperationDataList.push({
          node: parentNode,
          tags,
        });
      }
    }

    return sourceOperationDataList;
  }
}
