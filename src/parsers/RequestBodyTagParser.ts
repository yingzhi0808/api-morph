import type { JSDocTag } from "ts-morph";
import YAML from "yaml";
import z from "zod/v4";
import { RequestBodyBuilder } from "@/builders";
import { JSDocTagName } from "@/constants";
import { getZodErrorMessage } from "@/helpers";
import { normalizeMediaType } from "@/helpers/mediaType";
import type {
  ParsedTagData,
  ParsedTagParams,
  RequestBodyTagData,
  RequestBodyTagParams,
} from "@/types";
import { isExtensionKey } from "@/utils";
import { TagParser } from "./TagParser";

/**
 * 请求体标签解析器，处理 `@requestBody` 标签。
 * 支持简化语法: `@requestBody [mediaType] [schema] [description]`。
 *
 * 当省略 mediaType 但提供了 schema 时，会自动使用默认的请求体媒体类型。
 */
export class RequestBodyTagParser extends TagParser {
  tags = [JSDocTagName.REQUEST_BODY];

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  async parse(tag: JSDocTag) {
    const params = await this.parseTagParamsWithYaml(tag);
    const transformedParams = this.transformParams(params);
    const validatedParams = this.validateParams(transformedParams);
    return this.buildRequestBody(validatedParams);
  }

  /**
   * 转换参数的钩子方法，子类可以重写此方法来完全控制参数转换。
   * @param params 参数对象。
   * @returns 转换后的参数对象。
   */
  protected transformParams(params: ParsedTagParams): Partial<RequestBodyTagParams> {
    const { inline, yaml } = params;

    // 尝试解析简化语法
    const simplified = this.parseSimplifiedSyntax(inline);
    if (simplified) {
      return {
        description: simplified.description,
        yaml: simplified.yaml,
      };
    }

    // 回退到原始语法
    const [description] = inline;
    return { description, yaml };
  }

  /**
   * 解析简化语法，格式：`[mediaType] [schema] [description]`
   * @param inlineParams 内联参数数组
   * @returns 解析结果或null
   */
  private parseSimplifiedSyntax(inlineParams: string[]) {
    if (inlineParams.length === 0) return null;

    let mediaType: string | undefined;
    let schemaRef: string | undefined;
    let description: string | undefined;

    const parts = [...inlineParams];

    // 先查找包含 $ref 的参数作为 schema
    const schemaIndex = parts.findIndex((part) => part.includes("$ref:"));
    if (schemaIndex !== -1) schemaRef = parts.splice(schemaIndex, 1)[0];

    // 检查第一个参数是否为 media type
    if (parts.length > 0) {
      const normalizedMediaType = normalizeMediaType(parts[0]);
      if (normalizedMediaType) {
        mediaType = normalizedMediaType;
        parts.shift();
      }
    }

    // 剩余部分作为描述
    if (parts.length > 0) description = parts[0];

    // 如果有 schema 但没有 mediaType，使用默认的请求体媒体类型
    if (schemaRef && !mediaType) mediaType = this.context.options.defaultRequestMediaType;

    // 简化语法必须包含 mediaType 或 schemaRef
    // 如果两者都没有，说明不是简化语法（比如只有描述），返回 null 使用原始语法
    if (!mediaType && !schemaRef) return null;

    // 构建 yaml 参数（简化语法总是需要生成 yaml）
    const yaml: Record<string, unknown> = {};

    if (mediaType) {
      if (schemaRef) {
        let schema: unknown;
        try {
          // 解析预处理后的 schema 引用
          schema = YAML.parse(schemaRef);
        } catch {
          // 如果解析失败，返回 null 使用原始语法
          return null;
        }

        if (schema) yaml.content = { [mediaType]: { schema } };
      } else {
        // 只有 mediaType，没有 schema，创建空的 content
        yaml.content = { [mediaType]: {} };
      }
    }

    return {
      description,
      yaml,
    };
  }

  /**
   * 验证请求体标签的参数和YAML参数。
   * @param params 参数对象。
   * @returns 验证后的数据对象。
   */
  protected validateParams(params: unknown) {
    const message =
      `\n正确格式:\n` +
      `  @${JSDocTagName.REQUEST_BODY} [mediaType] [schema] [description]\n` +
      `  description?: string\n` +
      `  content?: Record<string, MediaTypeObject>\n` +
      `  required?: boolean\n` +
      `  [key: \`x-\${string}\`]: any\n`;

    // @ts-ignore
    const schema: z.ZodType<RequestBodyTagData> = z.object({
      description: z.string().optional(),
      yaml: z.record(
        z.string(),
        z.unknown(),
        `@${JSDocTagName.REQUEST_BODY} 标签必须包含 YAML 参数`,
      ),
    });

    const { success, data, error } = schema.safeParse(params);
    if (!success) throw new Error(getZodErrorMessage(error) + message);
    return data;
  }

  /**
   * 构建请求体对象。
   * @param params 参数对象。
   * @returns 构建的请求体对象。
   */
  private buildRequestBody(params: RequestBodyTagData): ParsedTagData {
    const { description, yaml } = params;
    const requestBodyBuilder = new RequestBodyBuilder();

    let finalDescription = description;
    if (yaml.description) finalDescription = yaml.description;
    if (finalDescription) requestBodyBuilder.setDescription(finalDescription);

    if (yaml.content) {
      Object.entries(yaml.content).forEach(([mediaType, mediaTypeObject]) => {
        requestBodyBuilder.addContent(mediaType, mediaTypeObject);
      });
    }

    if (yaml.required !== undefined) requestBodyBuilder.setRequired(yaml.required);

    Object.entries(yaml).forEach(([key, value]) => {
      if (isExtensionKey(key)) requestBodyBuilder.addExtension(key, value);
    });

    return {
      requestBody: requestBodyBuilder.build(),
    };
  }
}
