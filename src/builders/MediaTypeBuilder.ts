import { cloneDeep } from "radashi";
import type { ZodType } from "zod/v4";
import z from "zod/v4";
import type { Builder } from "@/builders/Builder";
import type {
  EncodingObject,
  ExampleObject,
  MediaTypeObject,
  ReferenceObject,
  SchemaObject,
} from "@/types/openapi";
import { isZodSchema } from "@/utils/typeGuards";

/**
 * 媒体类型构建器，用于构建 OpenAPI MediaTypeObject
 *
 * @category Builders
 */
export class MediaTypeBuilder implements Builder<MediaTypeObject> {
  private mediaType: MediaTypeObject = {};

  build() {
    return cloneDeep(this.mediaType);
  }

  /**
   * 设置媒体类型的 Schema。
   * @param schema Schema 对象、布尔值或 Zod schema。
   * @returns 媒体类型构建器。
   */
  setSchema(schema: MediaTypeObject["schema"] | ZodType) {
    if (isZodSchema(schema)) {
      this.mediaType.schema = z.toJSONSchema(schema as ZodType) as SchemaObject;
    } else {
      this.mediaType.schema = schema;
    }
    return this;
  }

  /**
   * 设置媒体类型的单个示例。
   * @param example 示例值。
   * @returns 媒体类型构建器。
   */
  setExample(example: unknown) {
    this.mediaType.example = example;
    return this;
  }

  /**
   * 设置媒体类型的多个示例。
   * @param examples 示例对象集合。
   * @returns 媒体类型构建器。
   */
  setExamples(examples: Record<string, ExampleObject | ReferenceObject>) {
    this.mediaType.examples = examples;
    return this;
  }

  /**
   * 添加单个属性的编码信息。
   * @param propertyName 属性名称。
   * @param encodingObject 编码对象。
   * @returns 媒体类型构建器。
   */
  addEncoding(propertyName: string, encodingObject: EncodingObject) {
    if (!this.mediaType.encoding) {
      this.mediaType.encoding = {};
    }
    if (!this.mediaType.encoding[propertyName]) {
      this.mediaType.encoding[propertyName] = encodingObject;
    }
    return this;
  }

  /**
   * 添加扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 媒体类型构建器。
   */
  addExtension(key: `x-${string}`, value: unknown) {
    if (!this.mediaType[key]) {
      this.mediaType[key] = value;
    }
    return this;
  }
}
