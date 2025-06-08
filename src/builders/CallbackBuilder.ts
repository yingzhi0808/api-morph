import { cloneDeep } from "radashi";
import type { Builder } from "@/core";
import type { CallbackObject, PathItemObject } from "@/types";

/**
 * 回调构建器，用于构建 OpenAPI CallbackObject
 */
export class CallbackBuilder implements Builder<CallbackObject> {
  private callback: CallbackObject = {};

  build() {
    return cloneDeep(this.callback);
  }

  /**
   * 添加回调表达式。
   * @param expression 运行时计算的表达式，用于标识回调操作的URL。
   * @param pathItem 描述一组请求和预期响应的路径项对象。
   * @returns 回调构建器。
   */
  addExpression(expression: string, pathItem: PathItemObject) {
    const callback = this.callback;
    if (!callback[expression]) callback[expression] = pathItem;
    return this;
  }

  /**
   * 添加扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 回调构建器。
   */
  addExtension(key: `x-${string}`, value: unknown) {
    const document = this.callback;
    if (!document[key]) document[key] = value;
    return this;
  }
}
