import { cloneDeep } from "radashi";
import type { Builder } from "@/core";
import type { ExternalDocumentationObject } from "@/types";

/**
 * 外部文档构建器，用于构建 OpenAPI ExternalDocumentationObject
 */
export class ExternalDocsBuilder implements Builder<ExternalDocumentationObject> {
  private externalDocs: ExternalDocumentationObject = { url: "" };

  build() {
    return cloneDeep(this.externalDocs);
  }

  /**
   * 设置外部文档URL。
   * @param url 外部文档URL（必需）。
   * @returns 外部文档构建器。
   */
  setUrl(url: string) {
    this.externalDocs.url = url;
    return this;
  }

  /**
   * 设置外部文档描述。
   * @param description 外部文档描述。
   * @returns 外部文档构建器。
   */
  setDescription(description: string) {
    this.externalDocs.description = description;
    return this;
  }

  /**
   * 添加扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 响应构建器。
   */
  addExtension(key: `x-${string}`, value: unknown) {
    const externalDocs = this.externalDocs;
    if (!externalDocs[key]) externalDocs[key] = value;
    return this;
  }
}
