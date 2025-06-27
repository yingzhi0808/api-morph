import { cloneDeep } from "radashi";
import type { Builder } from "@/builders/Builder";
import type {
  HeaderObject,
  LinkObject,
  MediaTypeObject,
  ReferenceObject,
  ResponseObject,
} from "@/types/openapi";

/**
 * 响应构建器，用于构建 OpenAPI ResponseObject
 *
 * @category Builders
 */
export class ResponseBuilder implements Builder<ResponseObject> {
  private response: ResponseObject = { description: "" };

  build() {
    return cloneDeep(this.response);
  }

  /**
   * 设置响应描述。
   * @param description 响应描述。
   * @returns 响应构建器。
   */
  setDescription(description: string) {
    this.response.description = description;
    return this;
  }

  /**
   * 添加响应的单个头信息定义。头部名称会被转换为小写，
   * 并且会过滤掉 `content-type` 头（OpenAPI 规范要求响应 headers 不应包含 "content-type"）。
   * @param name 要设置的头信息的名称。
   * @param header 头对象或引用对象。
   * @returns 响应构建器。
   */
  addHeader(name: string, header: HeaderObject | ReferenceObject) {
    const response = this.response;
    if (!response.headers) {
      response.headers = {};
    }

    const lowerName = name.toLowerCase();
    if (lowerName === "content-type") {
      return this;
    }
    if (!response.headers[lowerName]) {
      response.headers[lowerName] = header;
    }
    return this;
  }

  /**
   * 添加响应的单个内容类型定义。
   * @param mediaType 媒体类型 (例如 'application/json')。
   * @param mediaTypeObject 媒体类型对象。
   * @returns 响应构建器。
   */
  addContent(mediaType: string, mediaTypeObject: MediaTypeObject) {
    const response = this.response;
    if (!response.content) {
      response.content = {};
    }
    if (!response.content[mediaType]) {
      response.content[mediaType] = mediaTypeObject;
    }
    return this;
  }

  /**
   * 添加响应的单个链接定义。
   * @param name 要设置的链接的名称。
   * @param link 链接对象或引用对象。
   * @returns 响应构建器。
   */
  addLink(name: string, link: LinkObject | ReferenceObject) {
    const response = this.response;
    if (!response.links) {
      response.links = {};
    }
    if (!response.links[name]) {
      response.links[name] = link;
    }
    return this;
  }

  /**
   * 添加扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 响应构建器。
   */
  addExtension(key: `x-${string}`, value: unknown) {
    const response = this.response;
    if (!response[key]) {
      response[key] = value;
    }
    return this;
  }
}
