import deepmerge from "deepmerge";
import { OperationBuilder } from "@/builders";
import type { OperationData, ParsedOperation, SourceOperationData } from "@/types";
import { isExtensionKey } from "@/utils";
import type { ASTAnalyzerRegistry } from "./ASTAnalyzerRegistry";
import type { TagParserRegistry } from "./TagParserRegistry";

/**
 * 操作组合器，负责整合 JSDoc 标签解析和 AST 分析的结果，构建完整的 API 操作
 */
export class OperationComposer {
  /**
   * 创建操作组合器实例。
   * @param tagParserRegistry 标签解析器注册表。
   * @param astAnalyzerRegistry AST分析器注册表。
   */
  constructor(
    private readonly tagParserRegistry: TagParserRegistry,
    private readonly astAnalyzerRegistry: ASTAnalyzerRegistry,
  ) {}

  /**
   * 组合单个操作的所有数据源，构建完整的解析后操作。
   * @param sourceOperationData 待处理的操作源数据。
   * @returns 组合后的完整操作。
   */
  async compose(sourceOperationData: SourceOperationData) {
    // 分析AST结构，收集分析器结果
    let astAnalysisData: OperationData = {};
    const analyzers = this.astAnalyzerRegistry.getAnalyzers(sourceOperationData.node);
    for (const analyzer of analyzers) {
      const analysisResult = await analyzer.analyze(sourceOperationData.node);
      if (analysisResult) {
        astAnalysisData = deepmerge(astAnalysisData, analysisResult);
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
    console.log(tagParsingData);

    // 合并AST分析和标签解析结果，标签解析结果优先
    const combinedOperationData = { ...astAnalysisData, ...tagParsingData };

    return this.buildOperation(combinedOperationData);
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

    if (operationData.server) {
      operationBuilder.addServer(operationData.server);
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
