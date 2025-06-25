import type { JSDocTag } from "ts-morph";
import YAML from "yaml";
import z from "zod/v4";
import { RequestBodyBuilder } from "@/builders";
import { JSDocTagName } from "@/constants";
import { TagParser } from "@/core/TagParser";
import { getZodErrorMessage } from "@/helpers";
import { normalizeMediaType } from "@/helpers/mediaType";
import type { MediaTypeObject, OperationData, ParsedTagParams, RequestBodyObject } from "@/types";
import { isExtensionKey } from "@/utils";

/**
 * 请求体标签解析器，处理 `@requestBody` 标签。
 * 支持简化语法: `@requestBody [mediaType] [schema] [description]`。
 *
 * 当省略 mediaType 但提供了 schema 时，会自动使用默认的请求体媒体类型。
 */
export class RequestBodyTagParser extends TagParser {
  tags: string[] = [JSDocTagName.REQUEST_BODY];

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
  protected transformParams(params: ParsedTagParams) {
    const { inline, yaml = {} } = params;

    let mediaType = this.context.options.defaultRequestBodyMediaType!;
    let schemaRef: string | undefined;
    let content: Record<string, MediaTypeObject> | undefined;
    let required: boolean | undefined;

    const parts = [...inline];

    // 先查找包含 $ref 的参数作为 schema
    const schemaIndex = parts.findIndex((part) => part.includes("$ref:"));
    if (schemaIndex !== -1) {
      schemaRef = parts.splice(schemaIndex, 1)[0];
    }

    // 检查是否包含 required 参数
    const requiredIndex = parts.findIndex((part) => part === "required");
    if (requiredIndex !== -1) {
      required = true;
      parts.splice(requiredIndex, 1);
    }

    // 检查第一个剩余参数是否为 media type
    if (parts.length > 0) {
      const normalizedMediaType = normalizeMediaType(parts[0]);
      if (normalizedMediaType) {
        mediaType = normalizedMediaType;
        parts.shift();
      }
    }

    // 剩余的第一个参数作为描述
    const description = parts[0];

    // 构建 content 对象
    if (schemaRef) {
      const schema = YAML.parse(schemaRef);
      content = { [mediaType]: { schema } };
    } else {
      content = { [mediaType]: {} };
    }

    return {
      description,
      content,
      required,
      ...yaml,
    };
  }

  /**
   * 验证转换后的请求体参数。
   * @param params 参数对象。
   * @returns 验证后的数据对象。
   */
  private validateParams(params: unknown) {
    const message =
      `\n正确格式:\n` +
      `  @${JSDocTagName.REQUEST_BODY} [mediaType] [schema] [description] [required]\n` +
      `  description?: string\n` +
      `  required?: boolean\n` +
      `  content?: Record<string, MediaTypeObject>\n` +
      `  [key: \`x-\${string}\`]: any\n`;

    const schema = z
      .looseObject({
        description: z.string().optional(),
        content: z.record(z.string(), z.any()),
        required: z.boolean().optional(),
      })
      .check((ctx) => {
        const allKeys = Object.keys(ctx.value);
        const knownKeys = ["description", "required", "content"];
        const extraKeys = allKeys.filter((key) => !knownKeys.includes(key));
        const invalidKeys = extraKeys.filter((key) => !key.startsWith("x-"));

        if (invalidKeys.length > 0) {
          ctx.issues.push({
            code: "unrecognized_keys",
            input: ctx.value,
            keys: invalidKeys,
          });
        }
      });

    const { success, data, error } = schema.safeParse(params);
    if (!success) {
      throw new Error(getZodErrorMessage(error) + message);
    }
    return data;
  }

  /**
   * 构建请求体对象。
   * @param params 参数对象。
   * @returns 构建的请求体对象。
   */
  private buildRequestBody(params: RequestBodyObject): OperationData {
    const requestBodyBuilder = new RequestBodyBuilder();

    if (params.description) {
      requestBodyBuilder.setDescription(params.description);
    }

    if (params.required !== undefined) {
      requestBodyBuilder.setRequired(params.required);
    }

    Object.entries(params.content).forEach(([mediaType, mediaTypeObject]) => {
      requestBodyBuilder.addContent(mediaType, mediaTypeObject);
    });

    Object.entries(params).forEach(([key, value]) => {
      if (isExtensionKey(key)) {
        requestBodyBuilder.addExtension(key, value);
      }
    });

    return {
      requestBody: requestBodyBuilder.build(),
    };
  }
}
