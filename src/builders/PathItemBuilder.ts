import { cloneDeep } from "radashi";
import type { HttpMethod } from "@/constants";
import type {
  OperationObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  ServerObject,
} from "@/types";
import { isParameterObject } from "@/utils";
import type { Builder } from "./Builder";
import type { OperationBuilder } from "./OperationBuilder";
import type { ParameterBuilder } from "./ParameterBuilder";

/**
 * 路径项构建器，用于构建 OpenAPI PathItemObject
 */
export class PathItemBuilder implements Builder<PathItemObject> {
  private pathItem: PathItemObject = {};

  build() {
    return cloneDeep(this.pathItem);
  }

  /**
   * 设置路径项的引用。
   * @param ref 引用路径。
   * @returns 路径项构建器。
   */
  setRef(ref: string) {
    this.pathItem.$ref = ref;
    return this;
  }

  /**
   * 设置路径摘要。
   * @param summary 路径摘要。
   * @returns 路径项构建器。
   */
  setSummary(summary: string) {
    this.pathItem.summary = summary;
    return this;
  }

  /**
   * 设置路径描述。
   * @param description 路径描述。
   * @returns 路径项构建器。
   */
  setDescription(description: string) {
    this.pathItem.description = description;
    return this;
  }

  /**
   * 添加操作。
   * @param method HTTP 方法。
   * @param operation 操作对象。
   * @returns 路径项构建器。
   */
  addOperation(method: HttpMethod, operation: OperationObject) {
    const pathItem = this.pathItem;

    if (!pathItem[method]) pathItem[method] = operation;
    return this;
  }

  /**
   * 使用 OperationBuilder 添加操作。
   * @param operationBuilder 操作构建器实例。
   * @returns 路径项构建器。
   */
  addOperationFromBuilder(method: HttpMethod, operationBuilder: OperationBuilder) {
    const operation = operationBuilder.build();
    return this.addOperation(method, operation);
  }

  /**
   * 添加服务器信息到路径项中。
   * @param server 要添加的服务器对象。
   * @returns 路径项构建器。
   */
  addServer(server: ServerObject) {
    const pathItem = this.pathItem;
    if (!pathItem.servers) pathItem.servers = [];
    pathItem.servers.push(server);
    return this;
  }

  /**
   * 添加参数（ParameterObject）。
   * @param parameter 参数对象（ParameterObject）。
   * @returns 操作构建器。
   */
  addParameterFromObject(parameter: ParameterObject) {
    const pathItem = this.pathItem;
    if (!pathItem.parameters) pathItem.parameters = [];
    const exists = pathItem.parameters.some(
      (p) => isParameterObject(p) && p.name === parameter.name && p.in === parameter.in,
    );
    if (!exists) pathItem.parameters.push(parameter);

    return this;
  }

  /**
   * 添加参数引用（ReferenceObject）。
   * @param parameter 参数引用对象（ReferenceObject）。
   * @returns 操作构建器。
   */
  addParameterFromReference(parameter: ReferenceObject) {
    const pathItem = this.pathItem;
    if (!pathItem.parameters) pathItem.parameters = [];
    const exists = pathItem.parameters.some(
      (p) => !isParameterObject(p) && p.$ref === parameter.$ref,
    );
    if (!exists) pathItem.parameters.push(parameter);
    return this;
  }

  /**
   * 使用 ParameterBuilder 添加参数。
   * @param parameterBuilder 参数构建器实例。
   * @returns 操作构建器。
   */
  addParameterFromBuilder(parameterBuilder: ParameterBuilder) {
    const parameter = parameterBuilder.build();
    return this.addParameterFromObject(parameter);
  }

  /**
   * 添加扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 操作构建器。
   */
  addExtension(key: `x-${string}`, value: unknown) {
    const pathItem = this.pathItem;
    if (!pathItem[key]) pathItem[key] = value;
    return this;
  }
}
