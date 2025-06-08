import type { JSDocTag } from "ts-morph";
import { z } from "zod/v4";
import { ExternalDocsBuilder } from "@/builders";
import { JSDocTagName } from "@/constants";
import { TagParser } from "@/core";
import { getZodErrorMessage } from "@/helpers";
import type {
  ExternalDocsTagData,
  ExternalDocsTagParams,
  ParsedTagData,
  ParsedTagParams,
} from "@/types";
import { isExtensionKey } from "@/utils";

/**
 * 外部文档标签解析器，处理 `@externalDocs` 标签
 */
export class ExternalDocsTagParser extends TagParser {
  tags = [JSDocTagName.EXTERNAL_DOCS];

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  async parse(tag: JSDocTag) {
    const params = await this.parseTagParamsWithYaml(tag);
    const transformedParams = this.transformParams(params);
    const validatedParams = this.validateParams(transformedParams);
    return this.buildExternalDocs(validatedParams);
  }

  /**
   * 转换参数的钩子方法，子类可以重写此方法来完全控制参数转换。
   * @param params 参数对象。
   * @returns 转换后的参数对象。
   */
  protected transformParams(params: ParsedTagParams): Partial<ExternalDocsTagParams> {
    const { inline, yaml } = params;
    const [url, description] = inline;
    return { url, description, yaml };
  }

  /**
   * 验证外部文档标签的参数。
   * @param inline 内联参数数组。
   * @param params 参数对象。
   * @returns 验证后的参数对象。
   */
  protected validateParams(params: unknown) {
    const message =
      `\n正确格式:\n` +
      `  @${JSDocTagName.EXTERNAL_DOCS} <url> [description]\n` +
      `  description?: string\n` +
      `  [key: \`x-\${string}\`]: any\n`;

    // @ts-ignore
    const schema: z.ZodType<ExternalDocsTagData> = z.object({
      url: z.url({
        error: (iss) =>
          iss.input === undefined
            ? `@${JSDocTagName.EXTERNAL_DOCS} 标签 url 不能为空`
            : `@${JSDocTagName.EXTERNAL_DOCS} 标签提供的 url 格式无效: "${iss.input}"`,
      }),
      description: z.string().optional(),
      yaml: z.record(z.string(), z.unknown()).nullable().optional(),
    });

    const { success, data, error } = schema.safeParse(params);
    if (!success) throw new Error(getZodErrorMessage(error) + message);
    return data;
  }

  /**
   * 构建外部文档对象。
   * @param params 外部文档参数。
   * @returns 构建的外部文档对象。
   */
  private buildExternalDocs(params: ExternalDocsTagData): ParsedTagData {
    const { url, yaml, description } = params;
    const externalDocsBuilder = new ExternalDocsBuilder();

    externalDocsBuilder.setUrl(url);
    if (description !== undefined) externalDocsBuilder.setDescription(description);

    if (yaml) {
      for (const [key, value] of Object.entries(yaml)) {
        if (isExtensionKey(key)) externalDocsBuilder.addExtension(key, value);
      }
    }

    return {
      externalDocs: externalDocsBuilder.build(),
    };
  }
}
