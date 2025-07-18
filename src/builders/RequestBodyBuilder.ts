import { cloneDeep } from "radashi";
import type { Builder } from "@/builders/Builder";
import type { MediaTypeObject, RequestBodyObject } from "@/types/openapi";

/**
 * 请求体构建器，用于构建 OpenAPI RequestBodyObject
 *
 * @category Builders
 */
export class RequestBodyBuilder implements Builder<RequestBodyObject> {
  private requestBody: RequestBodyObject = { content: {} };

  build() {
    return cloneDeep(this.requestBody);
  }

  /**
   * 设置请求体描述。
   * @param description 请求体描述。
   * @returns 请求体构建器。
   */
  setDescription(description: string) {
    this.requestBody.description = description;
    return this;
  }

  /**
   * 添加请求体的单个内容类型定义。
   * @param mediaType 媒体类型 (例如 'application/json')
   * @param mediaTypeObject 媒体类型对象。
   * @returns 请求体构建器。
   */
  addContent(mediaType: string, mediaTypeObject: MediaTypeObject) {
    const requestBody = this.requestBody;
    if (!requestBody.content[mediaType]) {
      requestBody.content[mediaType] = mediaTypeObject;
    }
    return this;
  }

  /**
   * 设置请求体是否必需。
   * @param required 是否必需
   * @returns 请求体构建器。
   */
  setRequired(required: boolean) {
    this.requestBody.required = required;
    return this;
  }

  /**
   * 添加扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 请求体构建器。
   */
  addExtension(key: `x-${string}`, value: unknown) {
    const requestBody = this.requestBody;
    if (!requestBody[key]) {
      requestBody[key] = value;
    }
    return this;
  }
}
