import { cloneDeep } from "radashi";
import type { Builder } from "@/core";
import type { ServerObject, ServerVariableObject } from "@/types";

/**
 * 服务器构建器，用于构建 OpenAPI ServerObject
 */
export class ServerBuilder implements Builder<ServerObject> {
  private server: ServerObject = { url: "" };

  build() {
    return cloneDeep(this.server);
  }

  /**
   * 设置服务器URL。
   * @param url 服务器URL（必需）。
   * @returns 服务器构建器。
   */
  setUrl(url: string) {
    this.server.url = url;
    return this;
  }

  /**
   * 设置服务器描述。
   * @param description 服务器描述。
   * @returns 服务器构建器。
   */
  setDescription(description: string) {
    this.server.description = description;
    return this;
  }

  /**
   * 添加服务器变量。
   * @param name 变量名称。
   * @param variable 服务器变量对象。
   * @returns 服务器构建器。
   */
  addVariable(name: string, variable: ServerVariableObject) {
    const server = this.server;
    if (!server.variables) server.variables = {};
    if (!server.variables[name]) server.variables[name] = variable;
    return this;
  }

  /**
   * 添加扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 响应构建器。
   */
  addExtension(key: `x-${string}`, value: unknown) {
    const server = this.server;
    if (!server[key]) server[key] = value;
    return this;
  }
}
