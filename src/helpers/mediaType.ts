import * as mimeTypes from "mime-types";

/**
 * 标准化 media type，支持简写转换和验证
 * @param value 要检查的字符串（如 'json', 'application/json'）
 * @returns 标准化的 media type 或 null
 *
 * @example
 * ```typescript
 * normalizeMediaType('json') // 'application/json'
 * normalizeMediaType('application/json') // 'application/json'
 * normalizeMediaType('application/vnd.api+json') // 'application/vnd.api+json'
 * normalizeMediaType('invalid') // null
 * ```
 */
export function normalizeMediaType(value: string) {
  const result = mimeTypes.contentType(value);

  // 提取 media type 部分，去掉 charset 等参数
  if (result) {
    return result.split(";")[0].trim();
  }

  return null;
}
