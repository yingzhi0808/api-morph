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

export const VALID_HTTP_METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "patch",
  "options",
  "head",
  "trace",
];

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "trace";

export const VALID_PARAMETER_IN = ["query", "header", "path", "cookie"];
