import type { JSDocTag } from "ts-morph";
import z from "zod/v4";
import { JSDocTagName } from "@/constants";
import { TagParser } from "@/core";
import { getZodErrorMessage } from "@/helpers";
import type { ParsedTagData, ParsedTagParams } from "@/types";

/**
 * 标签解析器，处理 `@tags` 标签
 */
export class TagsTagParser extends TagParser {
  tags: string[] = [JSDocTagName.TAGS];

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  async parse(tag: JSDocTag) {
    const params = await this.parseTagParamsWithYaml(tag);
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
    const { inline } = params;
    return { tags: inline };
  }

  /**
   * 验证标签的参数。
   * @param params 参数对象。
   * @returns 验证后的参数对象。
   */
  private validateParams(params: unknown) {
    const message = `\n正确格式:\n  @${JSDocTagName.TAGS} <tag1> [tag2] [tag3] ...\n`;

    const schema = z.object({
      tags: z.array(z.string()).min(1, `@${JSDocTagName.TAGS} 标签至少需要一个标签`),
    });

    const { success, data, error } = schema.safeParse(params);
    if (!success) throw new Error(getZodErrorMessage(error) + message);
    return data;
  }

  /**
   * 构建解析结果。
   * @param params 验证后的参数。
   * @returns 构建的解析结果。
   */
  private buildResult(params: { tags: string[] }): ParsedTagData {
    return params;
  }
}
