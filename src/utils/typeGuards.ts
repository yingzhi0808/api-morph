import { isObject } from "radashi";
import type { ZodType } from "zod/v4";
import type { ParameterObject, ReferenceObject } from "@/types/openapi";

/**
 * 判断参数对象是否为 ParameterObject。
 * @param parameter - 要判断的参数对象。
 * @returns 如果参数对象是 ParameterObject 则返回 true，否则返回 false。
 */
export function isParameterObject(
  parameter: ParameterObject | ReferenceObject,
): parameter is ParameterObject {
  return "name" in parameter && "in" in parameter;
}

/**
 * 判断参数是否为 `x-` 开头的字符串。
 * @param key 要判断的参数。
 * @returns 如果参数是 `x-` 开头的字符串则返回 `true`，否则返回 `false`。
 */
export function isExtensionKey(key: string): key is `x-${string}` {
  return key.startsWith("x-");
}

/**
 * 判断给定的 value 是否为 Zod schema。
 * @param value 要判断的值。
 * @returns 如果是 Zod schema 则返回 true，否则返回 false。
 */
export function isZodSchema(value: unknown): value is ZodType {
  return isObject(value) && "_zod" in value;
}
