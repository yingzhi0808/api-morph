import type { Project, SourceFile } from "ts-morph";
import { SyntaxKind } from "typescript";
import { type DocumentBuilder, PathItemBuilder } from "@/builders";
import { JSDocTagName } from "@/constants";
import { TagParserRegistry } from "@/core";
import type {
  ParseContext,
  ParsedOperationData,
  ParserOptions,
  SourceOperationData,
} from "@/types";
import { CallbackTagParser } from "./CallbackTagParser";
import { DeprecatedTagParser } from "./DeprecatedTagParser";
import { DescriptionTagParser } from "./DescriptionTagParser";
import { ExtensionsTagParser } from "./ExtensionsTagParser";
import { ExternalDocsTagParser } from "./ExternalDocsTagParser";
import { OperationIdTagParser } from "./OperationIdTagParser";
import { OperationParser } from "./OperationParser";
import { OperationTagParser } from "./OperationTagParser";
import { ParameterTagParser } from "./ParameterTagParser";
import { RequestBodyTagParser } from "./RequestBodyTagParser";
import { ResponsesExtensionsTagParser } from "./ResponsesExtensionsTagParser";
import { ResponseTagParser } from "./ResponseTagParser";
import { SecurityTagParser } from "./SecurityTagParser";
import { ServerTagParser } from "./ServerTagParser";
import { SimplifiedResponseTagParser } from "./SimplifiedResponseTagParser";
import { TagsTagParser } from "./TagsTagParser";

/**
 * 解析整个项目中的 JSDoc 注释，并生成 OpenAPI 对象
 */
export class OpenAPIParser {
  /** 解析上下文 */
  private context: ParseContext;
  /** 标签解析器注册表 */
  private tagParserRegistry: TagParserRegistry;

  constructor(
    private project: Project,
    private options: ParserOptions = {},
  ) {
    this.context = this.createParseContext(this.project, options);
    this.tagParserRegistry = this.createTagParserRegistry(this.options);
  }

  /**
   * 解析整个项目，返回完整的 OpenAPI 对象。
   * @param documentBuilder 文档构建器实例。
   * @returns 返回完整的 OpenAPI 对象。
   */
  async parse(documentBuilder: DocumentBuilder) {
    const operationParser = new OperationParser(this.tagParserRegistry);

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
        operationParser.parse(sourceOperationData),
      ),
    );

    const filteredResults = this.filterDeprecatedOperations(results);
    const openAPIObject = this.buildOpenAPI(filteredResults, documentBuilder);
    return openAPIObject;
  }

  /**
   * 根据 includeDeprecated 选项过滤废弃的操作。
   * @param parsedOperationDataList 解析得到的操作数组。
   * @returns 过滤后的操作数组。
   */
  private filterDeprecatedOperations(
    parsedOperationDataList: ParsedOperationData[],
  ): ParsedOperationData[] {
    if (this.context.options.includeDeprecated) return parsedOperationDataList;
    return parsedOperationDataList.filter(
      (parsedOperationData) => !parsedOperationData.operation.deprecated,
    );
  }

  /**
   * 构建完整的 OpenAPI 文档。
   * @param parsedOperationDataList 解析得到的操作数组。
   * @param documentBuilder 预构建文档构建器实例。
   * @returns OpenAPI 文档对象。
   */
  private buildOpenAPI(
    parsedOperationDataList: ParsedOperationData[],
    documentBuilder: DocumentBuilder,
  ) {
    // 直接使用传入的 DocumentBuilder 实例
    const builder = documentBuilder;

    const tags = new Set<string>();
    const pathItemBuilders = new Map<string, PathItemBuilder>();

    for (const parsedOperationData of parsedOperationDataList) {
      const { path, method, operation } = parsedOperationData;

      let pathItemBuilder = pathItemBuilders.get(path);
      if (!pathItemBuilder) {
        pathItemBuilder = new PathItemBuilder();
        pathItemBuilders.set(path, pathItemBuilder);
      }

      pathItemBuilder.addOperation(method, operation);

      if (operation.tags) operation.tags.forEach((tag) => tags.add(tag));
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
      if (!hasOperation) continue;

      // 检查是否包含 @hidden 标签，如果有则跳过此操作
      const isHidden = tags.some((tag) => tag.getTagName() === JSDocTagName.HIDDEN);
      if (isHidden) continue;

      const parentNode = jsDocNode.getParent();
      if (parentNode) {
        sourceOperationDataList.push({
          node: parentNode,
          tags: tags,
        });
      }
    }

    return sourceOperationDataList;
  }
}
