import type { JSDocTag } from "ts-morph";
import z from "zod/v4";
import { getZodErrorMessage } from "@/helpers/zod";
import { type ParsedTagParams, TagParser } from "@/parsers/TagParser";
import { JSDocTagName } from "@/types/common";
import type { OperationData } from "@/types/parser";

/**
 * 扩展解析器，处理 `@extensions` 标签
 *
 * @category Parsers
 */
export class ExtensionsTagParser extends TagParser {
  tags: string[] = [JSDocTagName.EXTENSIONS];

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
    const { inline, yaml } = params;
    return { inline, yaml };
  }

  /**
   * 验证扩展标签的参数。
   * @param params 参数对象。
   * @returns 验证后的参数对象。
   */
  private validateParams(params: { inline: string[]; yaml?: Record<string, unknown> }) {
    const message = `\n正确格式:\n  @${JSDocTagName.EXTENSIONS}\n  [key: \`x-\${string}\`]: any\n`;

    if (params.inline.length > 0) {
      throw new Error(`@${JSDocTagName.EXTENSIONS} 标签不应包含任何 inline 参数${message}`);
    }

    const schema = z.record(z.templateLiteral(["x-", z.string()]), z.unknown(), {
      error: (iss) =>
        iss.code === "invalid_key"
          ? `@${JSDocTagName.EXTENSIONS} 标签的扩展名必须以 "x-" 开头`
          : `@${JSDocTagName.EXTENSIONS} 标签必须包含 YAML 参数`,
    });

    const { success, data, error } = schema.safeParse(params.yaml);
    if (!success) {
      throw new Error(getZodErrorMessage(error) + message);
    }

    return data;
  }

  /**
   * 构建解析结果。
   * @param extensions 验证后的扩展数据。
   * @returns 构建的解析结果。
   */
  private buildResult(extensions: Record<`x-${string}`, unknown>): OperationData {
    return { extensions };
  }
}
