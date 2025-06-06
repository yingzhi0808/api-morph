import http from "node:http";
import { camel } from "radashi";
import type { JSDocTag } from "ts-morph";
import YAML from "yaml";
import { normalizeMediaType } from "@/helpers/mediaType";
import type { ParsedTagParams } from "@/types";
import { ResponseTagParser } from "./ResponseTagParser";

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
 * 支持简化语法: `@<tagName> [mediaType] [schema] [description]`。
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

  /**
   * 转换参数，支持简化语法
   * @param params 解析的参数
   * @param tagName 标签名称
   * @returns 转换后的响应参数
   */
  protected override transformParams(params: ParsedTagParams, tag: JSDocTag) {
    const { inline, yaml } = params;
    const statusCode = tagToStatusCode[tag.getTagName()];

    const simplified = this.parseSimplifiedSyntax(inline);
    if (simplified) {
      return {
        statusCode,
        description: simplified.description,
        yaml: simplified.yaml,
      };
    }

    // 回退到原始语法
    return {
      statusCode,
      description: inline[0],
      yaml,
    };
  }

  /**
   * 解析简化语法
   * 格式：`[mediaType] [schema] [description]`
   * @param inlineParams 内联参数数组
   * @returns 解析结果或null
   */
  private parseSimplifiedSyntax(inlineParams: string[]) {
    if (inlineParams.length === 0) return null;

    let mediaType: string | undefined;
    let schemaRef: string | undefined;
    let description: string | undefined;

    const parts = [...inlineParams];

    // 先查找包含 $ref 的参数作为 schema
    const schemaIndex = parts.findIndex((part) => part.includes("$ref:"));
    if (schemaIndex !== -1) schemaRef = parts.splice(schemaIndex, 1)[0];

    // 检查第一个参数是否为 media type
    if (parts.length > 0) {
      const normalizedMediaType = normalizeMediaType(parts[0]);
      if (normalizedMediaType) {
        mediaType = normalizedMediaType;
        parts.shift();
      }
    }

    // 剩余部分作为描述
    if (parts.length > 0) description = parts[0];

    // 如果有 schema 但没有 mediaType，使用默认的响应媒体类型
    if (schemaRef && !mediaType) mediaType = this.context.options.defaultResponseMediaType;

    // 如果没有 mediaType 和 schemaRef，使用原始语法
    if (!mediaType && !schemaRef) return null;

    const yaml: Record<string, unknown> = {};

    if (mediaType) {
      if (schemaRef) {
        let schema: unknown;
        try {
          // 解析预处理后的 schema 引用
          schema = YAML.parse(schemaRef);
        } catch {
          // 如果解析失败，返回 null 使用原始语法
          return null;
        }

        if (schema) yaml.content = { [mediaType]: { schema } };
      } else {
        // 只有 mediaType，没有 schema，创建空的 content
        yaml.content = { [mediaType]: {} };
      }
    }

    return {
      description,
      yaml: Object.keys(yaml).length > 0 ? yaml : undefined,
    };
  }
}
