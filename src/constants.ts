/**
 * JSDoc 标签名称枚举，定义支持的所有 JSDoc 标签
 */
export enum JSDocTagName {
  OPERATION = "operation",
  TAGS = "tags",
  DESCRIPTION = "description",
  EXTERNAL_DOCS = "externalDocs",
  OPERATION_ID = "operationId",
  PARAMETER = "parameter",
  REQUEST_BODY = "requestBody",
  RESPONSE = "response",
  CALLBACK = "callback",
  DEPRECATED = "deprecated",
  SECURITY = "security",
  SERVER = "server",
  EXTENSIONS = "extensions",
  RESPONSES_EXTENSIONS = "responsesExtensions",
  HIDDEN = "hidden",
}

/**
 * 所有有效的 HTTP 方法列表
 */
export const VALID_HTTP_METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
  "trace",
] as const;

/**
 * 所有有效的参数位置（in）列表
 */
export const VALID_PARAMETER_IN = ["query", "header", "path", "cookie"] as const;

/**
 * HTTP 方法类型
 */
export type HttpMethod = (typeof VALID_HTTP_METHODS)[number];
