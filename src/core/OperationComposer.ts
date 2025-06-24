import deepmerge from "deepmerge";
import { OperationBuilder } from "@/builders";
import type { MediaTypeObject, OperationData, ParsedOperation, SourceOperationData } from "@/types";
import { isExtensionKey } from "@/utils";
import type { FrameworkAnalyzerRegistry } from "./FrameworkAnalyzerRegistry";
import type { TagParserRegistry } from "./TagParserRegistry";

/**
 * 操作组合器，负责整合 JSDoc 标签解析和框架代码分析的结果，构建完整的 API 操作
 */
export class OperationComposer {
  /**
   * 创建操作组合器实例。
   * @param tagParserRegistry 标签解析器注册表。
   * @param frameworkAnalyzerRegistry 框架分析器注册表。
   */
  constructor(
    private readonly tagParserRegistry: TagParserRegistry,
    private readonly frameworkAnalyzerRegistry: FrameworkAnalyzerRegistry,
  ) {}

  /**
   * 组合单个操作的所有数据源，构建完整的解析后操作。
   * @param sourceOperationData 待处理的操作源数据。
   * @returns 组合后的完整操作。
   */
  async compose(sourceOperationData: SourceOperationData) {
    // 框架优先策略：找到第一个能处理的框架就返回其结果
    let codeAnalysisData: OperationData = {};
    const frameworkAnalyzer = this.frameworkAnalyzerRegistry.getFirstMatchingAnalyzer(
      sourceOperationData.node,
    );

    if (frameworkAnalyzer) {
      const analysisResult = await frameworkAnalyzer.analyze(sourceOperationData.node);
      if (analysisResult) {
        codeAnalysisData = analysisResult;
      }
    }

    // 解析JSDoc标签，收集解析器结果
    let tagParsingData: OperationData = {};
    for (const tag of sourceOperationData.tags) {
      const tagName = tag.getTagName();
      const parser = this.tagParserRegistry.getParser(tagName);

      if (!parser) {
        throw new Error(
          `未找到标签 @${tagName} 的解析器。` +
            `可用的解析器标签有: ${this.tagParserRegistry.getAllTagNames().join(", ")}`,
        );
      }

      const parsingResult = await parser.parse(tag);
      if (parsingResult) {
        tagParsingData = deepmerge(tagParsingData, parsingResult);
      }
    }

    // 合并框架分析和标签解析结果，标签解析结果优先
    const combinedOperationData = this.mergeOperationData(codeAnalysisData, tagParsingData);
    return this.buildOperation(combinedOperationData);
  }

  /**
   * 合并两个操作数据，对 requestBody 进行浅合并。
   * @param codeData 框架分析数据。
   * @param tagData 标签解析数据。
   * @returns 合并后的操作数据。
   */
  private mergeOperationData(codeData: OperationData, tagData: OperationData): OperationData {
    const merged = { ...codeData, ...tagData };

    // 对 requestBody 进行浅合并
    if (codeData.requestBody && tagData.requestBody) {
      merged.requestBody = {
        ...codeData.requestBody,
        ...tagData.requestBody,
        content: this.mergeRequestBodyContent(
          codeData.requestBody.content,
          tagData.requestBody.content,
        ),
      };
    }

    return merged;
  }

  /**
   * 智能合并 requestBody 的 content 字段。
   * - 当 tagContent 只有一项时，使用标签中的 mediaType 替换代码分析的 mediaType，但保留 schema 内容。
   * - 当 tagContent 有多项时，进行叠加合并。
   * @param codeContent 代码分析得到的 content。
   * @param tagContent 标签解析得到的 content。
   * @returns 合并后的 content。
   */
  private mergeRequestBodyContent(
    codeContent: Record<string, MediaTypeObject> = {},
    tagContent: Record<string, MediaTypeObject> = {},
  ) {
    const tagContentKeys = Object.keys(tagContent);

    // 如果标签 content 只有一项，进行 mediaType 替换合并
    if (tagContentKeys.length === 1) {
      const tagMediaType = tagContentKeys[0];
      const tagMediaTypeObject = tagContent[tagMediaType];

      // 获取代码 content 中的第一个 schema（如果存在）
      const codeContentKeys = Object.keys(codeContent);
      if (codeContentKeys.length > 0) {
        const codeMediaTypeObject = codeContent[codeContentKeys[0]];

        // 如果标签中的 mediaType 对象没有 schema，但代码中有，则使用代码的 schema
        if (!tagMediaTypeObject.schema && codeMediaTypeObject?.schema) {
          return {
            [tagMediaType]: {
              ...tagMediaTypeObject,
              schema: codeMediaTypeObject.schema,
            },
          };
        }
      }

      // 如果标签中已有完整的 schema 或代码中没有 schema，直接使用标签的内容
      return tagContent;
    }

    // 如果标签 content 有多项或为空，进行叠加合并
    return {
      ...codeContent,
      ...tagContent,
    };
  }

  /**
   * 根据组合后的操作数据构建最终的操作对象。
   * @param operationData 组合后的操作数据。
   * @returns 完整的解析后操作。
   */
  private buildOperation(operationData: OperationData): ParsedOperation {
    const operationBuilder = new OperationBuilder();

    if (operationData.tags) {
      operationData.tags.forEach((tag) => operationBuilder.addTag(tag));
    }

    if (operationData.summary) {
      operationBuilder.setSummary(operationData.summary);
    }

    if (operationData.description) {
      operationBuilder.setDescription(operationData.description);
    }

    if (operationData.externalDocs) {
      operationBuilder.setExternalDocs(operationData.externalDocs);
    }

    if (operationData.operationId) {
      operationBuilder.setOperationId(operationData.operationId);
    }

    if (operationData.parameters) {
      operationData.parameters.forEach((param) => operationBuilder.addParameterFromObject(param));
    }

    if (operationData.requestBody) {
      operationBuilder.setRequestBody(operationData.requestBody);
    }

    if (operationData.responses) {
      Object.entries(operationData.responses).forEach(([statusCode, response]) => {
        operationBuilder.addResponse(statusCode, response);
      });
    }

    if (operationData.callback) {
      operationBuilder.addCallback(operationData.callback.name, operationData.callback.callback);
    }

    if (operationData.deprecated) {
      operationBuilder.setDeprecated(operationData.deprecated);
    }

    if (operationData.security) {
      operationBuilder.addSecurity(operationData.security);
    }

    if (operationData.servers) {
      operationData.servers.forEach((server) => operationBuilder.addServer(server));
    }

    if (operationData.extensions) {
      Object.entries(operationData.extensions).forEach(([key, value]) => {
        if (isExtensionKey(key)) {
          operationBuilder.addExtension(key, value);
        }
      });
    }

    if (operationData.responsesExtensions) {
      Object.entries(operationData.responsesExtensions).forEach(([key, value]) => {
        if (isExtensionKey(key)) {
          operationBuilder.addResponsesExtension(key, value);
        }
      });
    }

    return {
      operation: operationBuilder.build(),
      method: operationData.method!,
      path: operationData.path!,
    };
  }
}
