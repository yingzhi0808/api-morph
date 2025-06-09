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

  // 对于 mime-types 包无法识别的自定义 media type，
  // 使用正则表达式验证格式是否符合 RFC 6838 标准
  const mediaTypePattern =
    /^[a-zA-Z][a-zA-Z0-9][a-zA-Z0-9!#$&\-^]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^+]*$/;
  if (mediaTypePattern.test(value)) {
    return value;
  }

  return null;
}
