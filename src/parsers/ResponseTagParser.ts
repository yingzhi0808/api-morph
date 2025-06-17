import http from "node:http";
import type { JSDocTag } from "ts-morph";
import YAML from "yaml";
import z from "zod/v4";
import { ResponseBuilder } from "@/builders";
import { JSDocTagName } from "@/constants";
import { TagParser } from "@/core/TagParser";
import { getZodErrorMessage } from "@/helpers";
import { normalizeMediaType } from "@/helpers/mediaType";
import type { MediaTypeObject, OperationData, ParsedTagParams, ResponseObject } from "@/types";
import { isExtensionKey } from "@/utils";

/**
 * 响应标签解析器，处理 `@response` 标签。
 */
export class ResponseTagParser extends TagParser {
  tags: string[] = [JSDocTagName.RESPONSE];

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  async parse(tag: JSDocTag) {
    const params = await this.parseTagParamsWithYaml(tag);
    const transformedParams = this.transformParams(params, tag);
    const validatedParams = this.validateParams(transformedParams);
    return this.buildResponse(validatedParams);
  }

  /**
   * 转换参数的钩子方法，子类可以重写此方法来完全控制参数转换。
   * @param params 参数对象。
   * @returns 转换后的参数对象。
   */
  protected transformParams(params: ParsedTagParams, _tag: JSDocTag) {
    const { inline, yaml = {} } = params;

    let mediaType = this.context.options.defaultResponseMediaType!;
    let schemaRef: string | undefined;
    let content: Record<string, MediaTypeObject> | undefined;

    const parts = [...inline];

    // 第一个参数必须是状态码
    const statusCode = parts.shift();

    // 继续查找包含 $ref 的参数作为 schema
    const schemaIndex = parts.findIndex((part) => part.includes("$ref:"));
    if (schemaIndex !== -1) {
      schemaRef = parts.splice(schemaIndex, 1)[0];
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
    const description = parts[0] || (statusCode && http.STATUS_CODES[statusCode]) || "";

    // 构建 content 对象
    if (schemaRef) {
      const schema = YAML.parse(schemaRef);
      content = { [mediaType]: { schema } };
    } else {
      content = { [mediaType]: {} };
    }

    return {
      statusCode,
      description,
      content,
      ...yaml,
    };
  }

  /**
   * 验证转换后的响应参数。
   * @param params 参数对象。
   * @returns 验证后的数据对象。
   */
  private validateParams(params: unknown) {
    const message =
      `\n正确格式:\n` +
      `  @${JSDocTagName.RESPONSE} <statusCode> [mediaType] [schema] [description]\n` +
      `  description?: string\n` +
      `  headers?: Record<string, HeaderObject | ReferenceObject>\n` +
      `  content?: Record<string, MediaTypeObject>\n` +
      `  links?: Record<string, LinkObject | ReferenceObject>\n` +
      `  [key: \`x-\${string}\`]: any\n`;

    const schema: z.ZodType<ResponseObject & { statusCode: string }> = z
      .looseObject({
        statusCode: z
          .string({ error: `@${JSDocTagName.RESPONSE} 标签 statusCode 不能为空` })
          .regex(/^(\d{3}|default)$/, {
            error: (iss) =>
              `@${JSDocTagName.RESPONSE} 标签 statusCode 格式不正确："${iss.input}"，必须是3位数字或 "default"`,
          }),
        description: z.string(),
        headers: z.record(z.string(), z.any()).optional(),
        content: z.record(z.string(), z.any()).optional(),
        links: z.record(z.string(), z.any()).optional(),
      })
      .refine(
        (data) => {
          const knownKeys = ["statusCode", "description", "headers", "content", "links"];
          const extraKeys = Object.keys(data).filter((key) => !knownKeys.includes(key));
          return extraKeys.every((key) => key.startsWith("x-"));
        },
        {
          error: (iss) => `未知的 key: "${iss.key}"，扩展字段必须以 "x-" 开头`,
        },
      );

    const { success, data, error } = schema.safeParse(params);
    if (!success) {
      throw new Error(getZodErrorMessage(error) + message);
    }
    return data;
  }

  /**
   * 构建响应对象。
   * @param params 参数对象。
   * @returns 构建的响应对象。
   */
  private buildResponse(params: ResponseObject & { statusCode: string }): OperationData {
    const { statusCode, ...responseParams } = params;
    const responseBuilder = new ResponseBuilder();

    const finalDescription = responseParams.description || http.STATUS_CODES[statusCode] || "";
    if (finalDescription) {
      responseBuilder.setDescription(finalDescription);
    }

    // 添加头信息
    if (responseParams.headers) {
      Object.entries(responseParams.headers).forEach(([name, header]) => {
        responseBuilder.addHeader(name, header);
      });
    }

    if (responseParams.content) {
      Object.entries(responseParams.content).forEach(([mediaType, mediaTypeObject]) => {
        responseBuilder.addContent(mediaType, mediaTypeObject);
      });
    }

    if (responseParams.links) {
      Object.entries(responseParams.links).forEach(([name, link]) => {
        responseBuilder.addLink(name, link);
      });
    }

    Object.entries(responseParams).forEach(([key, value]) => {
      if (isExtensionKey(key)) {
        responseBuilder.addExtension(key, value);
      }
    });

    return {
      responses: { [statusCode]: responseBuilder.build() },
    };
  }
}
