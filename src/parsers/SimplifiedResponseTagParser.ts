import http from "node:http";
import { camel } from "radashi";
import type { JSDocTag } from "ts-morph";
import { ResponseTagParser } from "@/parsers";
import type { ParsedTagParams } from "@/types";

// 生成状态码到描述的映射：200 -> "ok", 201 -> "created", 400 -> "badRequest" 等
const statusCodeToTag = Object.fromEntries(
  Object.entries(http.STATUS_CODES).map(([key, value]) => [key, camel(value!)]),
);

// 生成标签名到状态码的映射：okResponse -> "200", createdResponse -> "201" 等
const tagToStatusCode = Object.fromEntries(
  Object.entries(statusCodeToTag).map(([statusCode, tag]) => [`${tag}Response`, statusCode]),
);

/**
 * 简化响应标签解析器，处理多种响应标签。
 *
 * 自动支持所有 HTTP 状态码的响应标签，例如：
 * - `@okResponse` (200)
 * - `@createdResponse` (201)
 * - `@noContentResponse` (204)
 * - `@badRequestResponse` (400)
 * - `@unauthorizedResponse` (401)
 * - `@forbiddenResponse` (403)
 * - `@notFoundResponse` (404)
 * - `@conflictResponse` (409)
 * - `@internalServerErrorResponse` (500)
 * - 以及所有其他 HTTP 状态码...
 */
export class SimplifiedResponseTagParser extends ResponseTagParser {
  override tags: string[] = Object.keys(tagToStatusCode);

  protected override transformParams(params: ParsedTagParams, tag: JSDocTag) {
    const tagName = tag.getTagName();
    const statusCode = tagToStatusCode[tagName];

    const modifiedParams: ParsedTagParams = {
      ...params,
      inline: [statusCode, ...params.inline],
    };

    return super.transformParams(modifiedParams, tag);
  }
}
