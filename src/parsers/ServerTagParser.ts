import type { JSDocTag } from "ts-morph";
import { z } from "zod/v4";
import { ServerBuilder } from "@/builders";
import { JSDocTagName } from "@/constants";
import { TagParser } from "@/core/TagParser";
import { getZodErrorMessage } from "@/helpers/zod";
import type { OperationData, ParsedTagParams, ServerTagData, ServerTagParams } from "@/types";
import { isExtensionKey } from "@/utils";

/**
 * 服务器标签解析器，处理 `@server` 标签
 */
export class ServerTagParser extends TagParser {
  tags: string[] = [JSDocTagName.SERVER];

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  async parse(tag: JSDocTag) {
    const params = await this.parseTagParamsWithYaml(tag);
    const transformedParams = this.transformParams(params);
    const validatedParams = this.validateParams(transformedParams);
    return this.buildServer(validatedParams);
  }

  /**
   * 转换参数的钩子方法，子类可以重写此方法来完全控制参数转换。
   * @param params 参数对象。
   * @returns 转换后的参数对象。
   */
  protected transformParams(params: ParsedTagParams): Partial<ServerTagParams> {
    const { inline, yaml } = params;
    const [url, description] = inline;
    return { url, description, yaml };
  }

  /**
   * 验证服务器标签的参数和YAML参数。
   * @param params 参数对象。
   * @returns 验证后的数据对象。
   */
  private validateParams(params: unknown) {
    const message =
      `\n正确格式:\n` +
      `  @${JSDocTagName.SERVER} <url> [description]\n` +
      `  description?: string\n` +
      `  variables?: Record<string, ServerVariableObject>\n` +
      `  [key: \`x-\${string}\`]: any\n`;

    // @ts-ignore
    const schema: z.ZodType<ServerTagData> = z.object({
      url: z.url({
        error: (iss) =>
          iss.input === undefined
            ? `@${JSDocTagName.SERVER} 标签 url 不能为空`
            : `@${JSDocTagName.SERVER} 标签提供的 url 格式无效: "${iss.input}"`,
      }),
      description: z.string().optional(),
      yaml: z.record(z.string(), z.unknown()).optional(),
    });

    const { success, data, error } = schema.safeParse(params);
    if (!success) {
      throw new Error(getZodErrorMessage(error) + message);
    }
    return data;
  }

  /**
   * 构建服务器对象。
   * @param params 参数对象。
   * @returns 构建的服务器对象。
   */
  private buildServer(params: ServerTagData): OperationData {
    const { url, description, yaml } = params;
    const serverBuilder = new ServerBuilder();

    serverBuilder.setUrl(url);

    let finalDescription = description;

    if (yaml) {
      if (yaml.description) {
        finalDescription = yaml.description;
      }

      if (yaml.variables) {
        for (const [name, variable] of Object.entries(yaml.variables)) {
          serverBuilder.addVariable(name, variable);
        }
      }

      for (const [key, value] of Object.entries(yaml)) {
        if (isExtensionKey(key)) {
          serverBuilder.addExtension(key, value);
        }
      }
    }

    if (finalDescription !== undefined) {
      serverBuilder.setDescription(finalDescription);
    }

    return {
      servers: [serverBuilder.build()],
    };
  }
}
