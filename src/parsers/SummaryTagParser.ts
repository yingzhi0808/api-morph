import type { JSDocTag } from "ts-morph";
import z from "zod/v4";
import { getZodErrorMessage } from "@/helpers/zod";
import { JSDocTagName } from "@/types/common";
import type { OperationData } from "@/types/parser";
import type { ParsedTagParams } from "./TagParser";
import { TagParser } from "./TagParser";

/**
 * 摘要标签解析器，处理 `@summary` 标签
 *
 * @category Parsers
 */
export class SummaryTagParser extends TagParser {
  tags: string[] = [JSDocTagName.SUMMARY];

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
    const [summary] = inline;
    return { summary };
  }

  /**
   * 验证摘要标签的参数。
   * @param params 参数对象。
   * @returns 验证后的参数对象。
   */
  private validateParams(params: unknown) {
    const message = `\n正确格式:\n  @${JSDocTagName.SUMMARY} <summary>\n`;

    const schema = z.object({
      summary: z.string(`@${JSDocTagName.SUMMARY} 标签 summary 不能为空`),
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
  private buildResult(params: { summary: string }): OperationData {
    return params;
  }
}
