import { cloneDeep } from "radashi";
import type {
  CallbackObject,
  ExternalDocumentationObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  SecurityRequirementObject,
  ServerObject,
} from "@/types";
import { isParameterObject } from "@/utils";
import type { Builder } from "./Builder";
import type { ParameterBuilder } from "./ParameterBuilder";
import type { RequestBodyBuilder } from "./RequestBodyBuilder";
import type { ResponseBuilder } from "./ResponseBuilder";

/**
 * 操作构建器，用于构建 OpenAPI OperationObject
 */
export class OperationBuilder implements Builder<OperationObject> {
  private operation: OperationObject = { responses: {} };

  build() {
    return cloneDeep(this.operation);
  }

  /**
   * 添加标签。
   * @param tag 标签
   * @returns 操作构建器。
   */
  addTag(tag: string) {
    const operation = this.operation;
    if (!operation.tags) operation.tags = [];
    if (!operation.tags.includes(tag)) operation.tags.push(tag);
    return this;
  }

  /**
   * 设置操作摘要。
   * @param summary 操作摘要
   * @returns 操作构建器。
   */
  setSummary(summary: string) {
    this.operation.summary = summary;
    return this;
  }

  /**
   * 设置操作描述。
   * @param description 操作描述。
   * @returns 操作构建器。
   */
  setDescription(description: string) {
    this.operation.description = description;
    return this;
  }

  /**
   * 设置外部文档。
   * @param externalDocs 外部文档对象。
   * @returns 操作构建器。
   */
  setExternalDocs(externalDocs: ExternalDocumentationObject) {
    this.operation.externalDocs = externalDocs;
    return this;
  }

  /**
   * 设置操作 ID。
   * @param operationId 操作 ID。
   * @returns 操作构建器。
   */
  setOperationId(operationId: string) {
    this.operation.operationId = operationId;
    return this;
  }

  /**
   * 添加参数（ParameterObject）。
   * @param parameter 参数对象（ParameterObject）。
   * @returns 操作构建器。
   */
  addParameterFromObject(parameter: ParameterObject) {
    const operation = this.operation;
    if (!operation.parameters) operation.parameters = [];
    const exists = operation.parameters.some(
      (p) => isParameterObject(p) && p.name === parameter.name && p.in === parameter.in,
    );
    if (!exists) operation.parameters.push(parameter);

    return this;
  }

  /**
   * 添加参数引用（ReferenceObject）。
   * @param parameter 参数引用对象（ReferenceObject）。
   * @returns 操作构建器。
   */
  addParameterFromReference(parameter: ReferenceObject) {
    const operation = this.operation;
    if (!operation.parameters) operation.parameters = [];
    const exists = operation.parameters.some(
      (p) => !isParameterObject(p) && p.$ref === parameter.$ref,
    );
    if (!exists) operation.parameters.push(parameter);
    return this;
  }

  /**
   * 使用 ParameterBuilder 添加参数。
   * @param parameterBuilder 参数构建器实例。
   * @returns 操作构建器。
   */
  addParameterFromBuilder(parameterBuilder: ParameterBuilder) {
    const parameter = parameterBuilder.build();
    return this.addParameterFromObject(parameter);
  }

  /**
   * 设置请求体。
   * @param requestBody 请求体对象。
   * @returns 操作构建器。
   */
  setRequestBody(requestBody: RequestBodyObject | ReferenceObject) {
    this.operation.requestBody = requestBody;
    return this;
  }

  /**
   * 使用 RequestBodyBuilder 设置请求体。
   * @param requestBodyBuilder 请求体构建器实例。
   * @returns 操作构建器。
   */
  setRequestBodyFromBuilder(requestBodyBuilder: RequestBodyBuilder) {
    const requestBody = requestBodyBuilder.build();
    return this.setRequestBody(requestBody);
  }

  /**
   * 添加响应。
   * @param statusCode HTTP 状态码。
   * @param response 响应对象。
   * @returns 操作构建器。
   */
  addResponse(statusCode: string | "default", response: ResponseObject | ReferenceObject) {
    const operation = this.operation;
    // 因为 operation.responses 是必填字段，所以它永远不会为空，这里的判断只是为了代码的一致性
    /* v8 ignore next */
    if (!operation.responses) operation.responses = {};
    if (!operation.responses[statusCode]) operation.responses[statusCode] = response;
    return this;
  }

  /**
   * 使用 ResponseBuilder 添加响应。
   * @param responseBuilder 响应构建器实例。
   * @returns 操作构建器。
   */
  addResponseFromBuilder(statusCode: string | "default", responseBuilder: ResponseBuilder) {
    const response = responseBuilder.build();
    return this.addResponse(statusCode, response);
  }

  /**
   * 添加回调。
   * @param name 回调事件的名称 (event name)。
   * @param callback 回调对象或引用对象。
   * @returns 操作构建器。
   */
  addCallback(name: string, callback: CallbackObject | ReferenceObject) {
    const operation = this.operation;
    if (!operation.callbacks) operation.callbacks = {};
    if (!operation.callbacks[name]) operation.callbacks[name] = callback;
    return this;
  }

  /**
   * 设置已废弃标志。
   * @param deprecated 是否已废弃。
   * @returns 操作构建器。
   */
  setDeprecated(deprecated: boolean) {
    this.operation.deprecated = deprecated;
    return this;
  }

  /**
   * 添加此操作特定的安全要求。
   * @param securityRequirement 单个安全要求对象。
   * @returns 操作构建器。
   */
  addSecurity(securityRequirement: SecurityRequirementObject) {
    const operation = this.operation;
    if (!operation.security) operation.security = [];
    operation.security.push(securityRequirement);
    return this;
  }

  /**
   * 添加此操作特定的服务器。
   * @param server 服务器对象。
   * @returns 操作构建器。
   */
  addServer(server: ServerObject) {
    const operation = this.operation;
    if (!operation.servers) operation.servers = [];
    operation.servers.push(server);
    return this;
  }

  /**
   * 添加扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 操作构建器。
   */
  addExtension(key: `x-${string}`, value: unknown) {
    const operation = this.operation;
    if (!operation[key]) operation[key] = value;
    return this;
  }

  /**
   * 添加响应扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 操作构建器。
   */
  addResponsesExtension(key: `x-${string}`, value: unknown) {
    const operation = this.operation;
    if (!operation.responses[key]) operation.responses[key] = value;
    return this;
  }
}
