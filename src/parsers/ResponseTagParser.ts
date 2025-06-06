import http from "node:http";
import type { JSDocTag } from "ts-morph";
import { z } from "zod/v4";
import { ResponseBuilder } from "@/builders";
import { JSDocTagName } from "@/constants";
import { getZodErrorMessage } from "@/helpers";
import type { ParsedTagData, ParsedTagParams, ResponseTagData, ResponseTagParams } from "@/types";
import { isExtensionKey } from "@/utils";
import { TagParser } from "./TagParser";

/**
 * 响应标签解析器，处理 `@response` 标签
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
  protected transformParams(params: ParsedTagParams, tag: JSDocTag): Partial<ResponseTagParams>;
  protected transformParams(params: ParsedTagParams): Partial<ResponseTagParams> {
    const { inline, yaml } = params;
    const [statusCode, description] = inline;
    return { statusCode, description, yaml };
  }

  /**
   * 验证响应标签的参数。
   * @param params 参数对象。
   * @returns 验证后的参数对象。
   */
  private validateParams(params: unknown) {
    const message =
      `\n正确格式:\n` +
      `  @${JSDocTagName.RESPONSE} <statusCode> [description]\n` +
      `  description?: string\n` +
      `  headers?: Record<string, HeaderObject | ReferenceObject>\n` +
      `  content?: Record<string, MediaTypeObject>\n` +
      `  links?: Record<string, LinkObject | ReferenceObject>\n` +
      `  [key: \`x-\${string}\`]: any\n`;

    // @ts-ignore
    const schema: z.ZodType<ResponseTagData> = z.object({
      statusCode: z
        .string({ error: `@${JSDocTagName.RESPONSE} 标签 statusCode 不能为空` })
        .regex(/^(\d{3}|default)$/, {
          error: (iss) =>
            `@${JSDocTagName.RESPONSE} 标签 statusCode 格式不正确："${iss.input}"，必须是3位数字或 "default"`,
        }),
      description: z.string().optional(),
      yaml: z.record(z.string(), z.unknown()).nullable().optional(),
    });

    const { success, data, error } = schema.safeParse(params);
    if (!success) throw new Error(getZodErrorMessage(error) + message);
    return data;
  }

  /**
   * 构建响应对象。
   * @param params 响应参数。
   * @returns 构建的响应对象。
   */
  private buildResponse(params: ResponseTagData): ParsedTagData {
    const { statusCode, yaml, description } = params;
    const responseBuilder = new ResponseBuilder();

    let finalDescription = description;

    if (yaml) {
      if (yaml.description) finalDescription = yaml.description;

      if (yaml.headers) {
        Object.entries(yaml.headers).forEach(([name, header]) => {
          responseBuilder.addHeader(name, header);
        });
      }

      if (yaml.content) {
        Object.entries(yaml.content).forEach(([mediaType, mediaTypeObject]) => {
          responseBuilder.addContent(mediaType, mediaTypeObject);
        });
      }

      if (yaml.links) {
        Object.entries(yaml.links).forEach(([name, link]) => {
          responseBuilder.addLink(name, link);
        });
      }

      Object.entries(yaml).forEach(([key, value]) => {
        if (isExtensionKey(key)) responseBuilder.addExtension(key, value);
      });
    }

    finalDescription = finalDescription || http.STATUS_CODES[statusCode] || "";
    if (finalDescription) responseBuilder.setDescription(finalDescription);

    return {
      response: {
        statusCode,
        response: responseBuilder.build(),
      },
    };
  }
}
