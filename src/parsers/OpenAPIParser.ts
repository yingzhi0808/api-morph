import micromatch from "micromatch";
import type { Project, SourceFile } from "ts-morph";
import { SyntaxKind } from "typescript";
import { ExpressFrameworkAnalyzer } from "@/analyzers/ExpressFrameworkAnalyzer";
import { HonoFrameworkAnalyzer } from "@/analyzers/HonoFrameworkAnalyzer";
import { KoaFrameworkAnalyzer } from "@/analyzers/KoaFrameworkAnalyzer";
import type { OpenAPIBuilder } from "@/builders/OpenAPIBuilder";
import { PathItemBuilder } from "@/builders/PathItemBuilder";
import { OperationComposer } from "@/core/OperationComposer";
import { FrameworkAnalyzerRegistry } from "@/registry/FrameworkAnalyzerRegistry";
import { TagParserRegistry } from "@/registry/TagParserRegistry";
import { JSDocTagName } from "@/types/common";
import type { ParameterObject, ReferenceObject } from "@/types/openapi";
import type {
  ParseContext,
  ParsedOperation,
  ParserOptions,
  SourceOperationData,
} from "@/types/parser";
import { CallbackTagParser } from "./CallbackTagParser";
import { DeprecatedTagParser } from "./DeprecatedTagParser";
import { DescriptionTagParser } from "./DescriptionTagParser";
import { ExtensionsTagParser } from "./ExtensionsTagParser";
import { ExternalDocsTagParser } from "./ExternalDocsTagParser";
import { OperationIdTagParser } from "./OperationIdTagParser";
import { OperationTagParser } from "./OperationTagParser";
import { ParameterTagParser } from "./ParameterTagParser";
import { RequestBodyTagParser } from "./RequestBodyTagParser";
import { ResponsesExtensionsTagParser } from "./ResponsesExtensionsTagParser";
import { ResponseTagParser } from "./ResponseTagParser";
import { SecurityTagParser } from "./SecurityTagParser";
import { ServerTagParser } from "./ServerTagParser";
import { SimplifiedResponseTagParser } from "./SimplifiedResponseTagParser";
import { SummaryTagParser } from "./SummaryTagParser";
import { TagsTagParser } from "./TagsTagParser";

/**
 * 解析整个项目中的 JSDoc 注释，并生成 OpenAPI 对象
 */
export class OpenAPIParser {
  /** 解析上下文 */
  private context: ParseContext;
  /** 标签解析器注册表 */
  private tagParserRegistry: TagParserRegistry;
  /** 框架分析器注册表 */
  private frameworkAnalyzerRegistry: FrameworkAnalyzerRegistry;

  constructor(
    private project: Project,
    private options: ParserOptions = {},
  ) {
    this.context = this.createParseContext(this.project, options);
    this.tagParserRegistry = this.createTagParserRegistry(this.options);
    this.frameworkAnalyzerRegistry = this.createFrameworkAnalyzerRegistry(this.options);
  }

  /**
   * 解析整个项目，返回完整的 OpenAPI 对象。
   * @param openAPIBuilder 文档构建器实例。
   * @returns 返回完整的 OpenAPI 对象。
   */
  async parse(openAPIBuilder: OpenAPIBuilder) {
    const operationComposer = new OperationComposer(
      this.tagParserRegistry,
      this.frameworkAnalyzerRegistry,
    );

    const includePatterns = this.context.options.include;
    const excludePatterns = this.context.options.exclude;

    let sourceFiles = this.project.getSourceFiles();

    if (includePatterns && includePatterns.length > 0) {
      sourceFiles = sourceFiles.filter((file) =>
        includePatterns.some((pattern) => micromatch.contains(file.getFilePath(), pattern)),
      );
    }

    if (excludePatterns && excludePatterns.length > 0) {
      sourceFiles = sourceFiles.filter(
        (file) =>
          !excludePatterns.some((pattern) => micromatch.contains(file.getFilePath(), pattern)),
      );
    }

    const flatOperationDataList = sourceFiles.flatMap((sourceFile) =>
      this.findSourceOperationDataList(sourceFile),
    );

    const results = await Promise.all(
      flatOperationDataList.map((sourceOperationData) =>
        operationComposer.compose(sourceOperationData),
      ),
    );

    const openAPIObject = this.buildOpenAPI(results, openAPIBuilder);
    return openAPIObject;
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

    // 获取全局响应配置
    const globalResponses = builder.getGlobalResponses();
    // 获取全局参数配置
    const globalParameters = builder.getGlobalParameters();

    for (const parsedOperationData of parsedOperationList) {
      const { path, method, operation } = parsedOperationData;

      // 应用全局响应到每个操作
      if (Object.keys(globalResponses).length > 0) {
        const mergedResponses = { ...globalResponses, ...operation.responses };
        operation.responses = mergedResponses;
      }

      // 应用全局参数到每个操作
      if (globalParameters.length > 0) {
        const existingParameters = operation.parameters || [];
        const mergedParameters = this.mergeParameters(globalParameters, existingParameters);
        operation.parameters = mergedParameters;
      }

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
   * 合并全局参数和操作特定参数。
   * 操作特定的参数会覆盖同名同位置的全局参数。
   * @param globalParameters 全局参数数组。
   * @param operationParameters 操作特定参数数组。
   * @returns 合并后的参数数组。
   */
  private mergeParameters(
    globalParameters: (ParameterObject | ReferenceObject)[],
    operationParameters: (ParameterObject | ReferenceObject)[],
  ): (ParameterObject | ReferenceObject)[] {
    // 分离引用对象和普通参数对象
    const globalRefs = globalParameters.filter((p): p is ReferenceObject => "$ref" in p);
    const globalParams = globalParameters.filter((p): p is ParameterObject => !("$ref" in p));

    const operationRefs = operationParameters.filter((p): p is ReferenceObject => "$ref" in p);
    const operationParams = operationParameters.filter((p): p is ParameterObject => !("$ref" in p));

    // 合并普通参数对象（操作特定参数覆盖同名同位置的全局参数）
    const mergedParams: ParameterObject[] = [...globalParams];

    for (const operationParam of operationParams) {
      const existingIndex = mergedParams.findIndex(
        (globalParam) =>
          globalParam.name === operationParam.name && globalParam.in === operationParam.in,
      );

      if (existingIndex !== -1) {
        // 替换同名同位置的全局参数
        mergedParams[existingIndex] = operationParam;
      } else {
        // 添加新的操作特定参数
        mergedParams.push(operationParam);
      }
    }

    // 合并结果：全局引用 + 操作特定引用 + 合并后的普通参数
    return [...globalRefs, ...operationRefs, ...mergedParams];
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
    const parsers = [...defaultParsers, ...(options.customTagParsers ?? [])];

    for (const parser of parsers) {
      tagParserRegistry.register(new parser(this.context));
    }

    return tagParserRegistry;
  }

  /**
   * 创建框架分析器注册表。
   * @param options 配置选项。
   * @returns 框架分析器注册表。
   */
  private createFrameworkAnalyzerRegistry(options: ParserOptions) {
    const frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();

    // 如果禁用了代码分析，返回空的注册表
    if (options.enableCodeAnalysis === false) {
      return frameworkAnalyzerRegistry;
    }

    const defaultFrameworkAnalyzers = [
      ExpressFrameworkAnalyzer,
      KoaFrameworkAnalyzer,
      HonoFrameworkAnalyzer,
    ];
    const frameworkAnalyzers = [
      ...defaultFrameworkAnalyzers,
      ...(options.customFrameworkAnalyzers ?? []),
    ];

    for (const analyzer of frameworkAnalyzers) {
      frameworkAnalyzerRegistry.register(new analyzer(this.context));
    }

    return frameworkAnalyzerRegistry;
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
      defaultResponseMediaType: "application/json",
      defaultRequestBodyMediaType: "application/json",
      enableCodeAnalysis: true,
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
   * 查找指定 TypeScript 文件中所有包含支持标签注释的代码节点。
   * @param sourceFile 要解析的 TypeScript 源文件。
   * @returns 返回一个 SourceOperationData 数组，其中每个对象包含被 JSDoc 标签注释的代码节点及其所有标签，
   * 如果未找到匹配的节点，则返回空数组。
   */
  private findSourceOperationDataList(sourceFile: SourceFile) {
    const jsDocNodes = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc);
    const sourceOperationDataList: SourceOperationData[] = [];
    const supportedTagNames = this.tagParserRegistry.getAllTagNames();

    for (const jsDocNode of jsDocNodes) {
      const tags = jsDocNode.getTags();

      // 检查是否包含支持的标签且不包含 @hidden 标签
      const shouldProcess = tags.some((tag) => {
        const tagName = tag.getTagName();
        return supportedTagNames.includes(tagName) && tagName !== JSDocTagName.HIDDEN;
      });
      if (!shouldProcess) {
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
