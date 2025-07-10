import type { Node } from "ts-morph";
import type { ZodError } from "zod/v4";
import z from "zod/v4";

/**
 * 判断节点是否为 ZodType。
 * @param node 要判断的节点。
 * @returns 如果类型是 ZodType 则返回 true，否则返回 false。
 */
export function isZodType(node: Node) {
  const nodeType = node.getType();
  return (
    nodeType.getText().includes("Zod") &&
    !!nodeType.getProperties().find((p) => p.getName() === "_zod")
  );
}

/**
 * 获取 ZodError 的错误信息。
 * @param error ZodError 实例。
 * @returns 错误信息。
 */
export function getZodErrorMessage(error: ZodError) {
  const flattenedError = z.flattenError(error);
  const formErrors = flattenedError.formErrors;
  const fieldErrors = Object.values(flattenedError.fieldErrors).flat();
  const message = formErrors[0] ?? fieldErrors[0];
  return message;
}
