import { OperationBuilder } from "@/builders";
import type { HttpMethod } from "@/constants";
import type { TagParserRegistry } from "@/core";
import type { ParsedOperationData, ParsedTagData, SourceOperationData } from "@/types";
import { isExtensionKey } from "@/utils";

/**
 * 操作解析器，负责解析单个 API 操作的 JSDoc 注释，并构建对应的 OperationObject
 */
export class OperationParser {
  /**
   * 创建操作解析器实例。
   * @param context 解析上下文。
   * @param tagParserRegistry 标签解析器注册表。
   */
  constructor(private readonly tagParserRegistry: TagParserRegistry) {}

  /**
   * 解析单个节点的 JSDoc 注释，构建 ParsedOperationData。
   * @param sourceOperationData 待解析的 Operation 源数据。
   * @returns 解析后的 ParsedOperationData。
   */
  async parse(sourceOperationData: SourceOperationData) {
    if (!sourceOperationData.tags?.length) return this.buildOperation([]);

    const parsedTagDataList: ParsedTagData[] = [];

    for (const tag of sourceOperationData.tags) {
      const originalTagName = tag.getTagName();
      const parser = this.tagParserRegistry.getParser(originalTagName);

      if (!parser) {
        throw new Error(
          `未找到标签 @${originalTagName} 的解析器。` +
            `可用的解析器标签有: ${this.tagParserRegistry.getAllTagNames().join(", ")}`,
        );
      }

      const parsedTagData = await parser.parse(tag);
      if (parsedTagData) parsedTagDataList.push(parsedTagData);
    }

    return this.buildOperation(parsedTagDataList);
  }

  /**
   * 将解析结果应用到操作构建器。
   * @param parsedTagDataList 解析结果。
   * @returns 操作对象。
   */
  private buildOperation(parsedTagDataList: ParsedTagData[]): ParsedOperationData {
    const operationBuilder = new OperationBuilder();
    let method = "" as HttpMethod;
    let path = "";

    for (const result of parsedTagDataList) {
      if (result.method) method = result.method;

      if (result.path) path = result.path;

      if (result.tags) result.tags.forEach((tag) => operationBuilder.addTag(tag));

      if (result.summary) operationBuilder.setSummary(result.summary);

      if (result.description) operationBuilder.setDescription(result.description);

      if (result.externalDocs) operationBuilder.setExternalDocs(result.externalDocs);

      if (result.operationId) operationBuilder.setOperationId(result.operationId);

      if (result.parameter) operationBuilder.addParameterFromObject(result.parameter);

      if (result.requestBody) operationBuilder.setRequestBody(result.requestBody);

      if (result.response)
        operationBuilder.addResponse(result.response.statusCode, result.response.response);

      if (result.callback)
        operationBuilder.addCallback(result.callback.name, result.callback.callback);

      if (result.deprecated) operationBuilder.setDeprecated(result.deprecated);

      if (result.security) operationBuilder.addSecurity(result.security);

      if (result.server) operationBuilder.addServer(result.server);

      if (result.extensions)
        Object.entries(result.extensions).forEach(([key, value]) => {
          if (isExtensionKey(key)) operationBuilder.addExtension(key, value);
        });

      if (result.responsesExtensions)
        Object.entries(result.responsesExtensions).forEach(([key, value]) => {
          if (isExtensionKey(key)) operationBuilder.addResponsesExtension(key, value);
        });
    }

    return {
      operation: operationBuilder.build(),
      method,
      path,
    };
  }
}
