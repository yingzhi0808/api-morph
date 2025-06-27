/**
 * HTTP 方法类型
 *
 * @category Types
 */
export type HttpMethod = "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "trace";

/**
 * 内置支持的 JSDoc 标签名称枚举
 *
 * @category Types
 */
export enum JSDocTagName {
  OPERATION = "operation",
  TAGS = "tags",
  SUMMARY = "summary",
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
 * 参数位置类型
 *
 * @category Types
 */
export type ParameterIn = "query" | "header" | "path" | "cookie";

/**
 * 参数样式类型
 *
 * @category Types
 */
export type ParameterStyle =
  | "matrix"
  | "label"
  | "simple"
  | "form"
  | "spaceDelimited"
  | "pipeDelimited"
  | "deepObject";
