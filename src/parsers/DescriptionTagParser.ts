import type { JSDocTag } from "ts-morph";
import z from "zod/v4";
import { JSDocTagName } from "@/constants";
import { TagParser } from "@/core/TagParser";
import { getZodErrorMessage } from "@/helpers";
import type { OperationData, ParsedTagParams } from "@/types";

/**
 * 描述解析器，处理 `@description` 标签
 */
export class DescriptionTagParser extends TagParser {
  tags: string[] = [JSDocTagName.DESCRIPTION];

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  async parse(tag: JSDocTag) {
    const params = await this.parseTagParamsWithYaml(tag, {
      preprocessJSDocLinks: false,
    });
    const transformedParams = this.transformParams(params);
    const validatedParams = this.validateParams(transformedParams);
    return this.buildResult(validatedParams);
  }

  /**
   * 转换参数的钩子方法，子类可以重写此方法来完全控制参数转换。
   * @param params 参数对象。
   * @returns 转换后的参数对象。
   */
  protected transformParams(params: ParsedTagParams) {
    const { rawText } = params;
    return { description: rawText };
  }

  /**
   * 验证描述标签的参数。
   * @param params 参数对象。
   * @returns 验证后的参数对象。
   */
  private validateParams(params: unknown) {
    const message = `\n正确格式:\n  @${JSDocTagName.DESCRIPTION} <description>\n`;

    const schema = z.object({
      description: z.string().min(1, `@${JSDocTagName.DESCRIPTION} 标签 description 不能为空`),
    });

    const { success, data, error } = schema.safeParse(params);
    if (!success) {
      throw new Error(getZodErrorMessage(error) + message);
    }
    return data;
  }

  /**
   * 构建解析结果。
   * @param params 验证后的参数。
   * @returns 构建的解析结果。
   */
  private buildResult(params: { description: string }): OperationData {
    return params;
  }
}
