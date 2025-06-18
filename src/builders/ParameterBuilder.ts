import { cloneDeep } from "radashi";
import type { ParameterIn } from "@/constants";
import type { Builder } from "@/core";
import type { ExampleObject, MediaTypeObject, ParameterObject, ReferenceObject } from "@/types";

/**
 * 参数构建器，用于构建 OpenAPI ParameterObject
 */
export class ParameterBuilder implements Builder<ParameterObject> {
  private parameter: ParameterObject;

  /**
   * 创建 ParameterBuilder 实例。
   * @param name 参数名称。
   * @param paramIn 参数位置。
   */
  constructor(name: string, paramIn: ParameterIn) {
    this.parameter = {
      name,
      in: paramIn,
      required: paramIn === "path" ? true : undefined,
    };
  }

  build() {
    return cloneDeep(this.parameter);
  }

  /**
   * 获取参数名称。
   * @returns 参数名称。
   */
  getName() {
    return this.parameter.name;
  }

  /**
   * 获取参数位置。
   * @returns 参数位置。
   */
  getIn() {
    return this.parameter.in;
  }

  /**
   * 设置参数描述。
   * @param description 参数描述。
   * @returns 参数构建器。
   */
  setDescription(description: string) {
    this.parameter.description = description;
    return this;
  }

  /**
   * 设置参数是否必需。
   * @param required 是否必需。
   * @returns 参数构建器。
   */
  setRequired(required: boolean) {
    this.parameter.required = required;
    return this;
  }

  /**
   * 设置参数是否已废弃。
   * @param deprecated 是否已废弃。
   * @returns 参数构建器。
   */
  setDeprecated(deprecated: boolean) {
    this.parameter.deprecated = deprecated;
    return this;
  }

  /**
   * 设置是否允许空值。
   * @param allowEmptyValue 是否允许空值。
   * @returns 参数构建器。
   */
  setAllowEmptyValue(allowEmptyValue: boolean) {
    this.parameter.allowEmptyValue = allowEmptyValue;
    return this;
  }

  /**
   * 设置参数样式。
   * @param style 参数样式。
   * @returns 参数构建器。
   */
  setStyle(style: ParameterObject["style"]) {
    this.parameter.style = style;
    return this;
  }

  /**
   * 设置是否展开对象。
   * @param explode 是否展开对象。
   * @returns 参数构建器。
   */
  setExplode(explode: boolean) {
    this.parameter.explode = explode;
    return this;
  }

  /**
   * 设置是否允许保留字符。
   * @param allowReserved 是否允许保留字符。
   * @returns 参数构建器。
   */
  setAllowReserved(allowReserved: boolean) {
    this.parameter.allowReserved = allowReserved;
    return this;
  }

  /**
   * 设置参数 Schema。
   * @param schema Schema 对象或引用对象。
   * @returns 参数构建器。
   */
  setSchema(schema: ParameterObject["schema"]) {
    this.parameter.schema = schema;
    return this;
  }

  /**
   * 设置参数的单个示例。
   * @param example 示例对象。
   * @returns 参数构建器。
   */
  setExample(example: unknown) {
    this.parameter.example = example;
    return this;
  }

  /**
   * 设置参数的多个示例。
   * @param examples 示例对象。
   * @returns 参数构建器。
   */
  setExamples(examples: Record<string, ExampleObject | ReferenceObject>) {
    this.parameter.examples = examples;
    return this;
  }

  /**
   * 添加参数的单个内容类型定义。
   * @param mediaType 媒体类型 (例如 'application/json')。
   * @param mediaTypeObject 媒体类型对象。
   * @returns 参数构建器。
   */
  addContent(mediaType: string, mediaTypeObject: MediaTypeObject) {
    const parameter = this.parameter;
    if (!parameter.content) {
      parameter.content = {};
    }
    if (!parameter.content[mediaType]) {
      parameter.content[mediaType] = mediaTypeObject;
    }
    return this;
  }

  /**
   * 添加扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 参数构建器。
   */
  addExtension(key: `x-${string}`, value: unknown) {
    const parameter = this.parameter;
    if (!parameter[key]) {
      parameter[key] = value;
    }
    return this;
  }
}
