import type { JSDocTag } from "ts-morph";
import { JSDocTagName } from "@/constants";
import { TagParser } from "@/core/TagParser";
import type { OperationData, ParsedTagParams } from "@/types";

/**
 * 废弃标记解析器，处理 `@deprecated` 标签
 */
export class DeprecatedTagParser extends TagParser {
  tags: string[] = [JSDocTagName.DEPRECATED];

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  async parse(tag: JSDocTag) {
    const params = await this.parseTagParamsWithYaml(tag);
    const transformedParams = this.transformParams(params);
    this.validateParams(transformedParams);
    return this.buildResult();
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
   * 验证废弃标签的参数。
   * @param params 参数对象。
   */
  private validateParams(params: { inline: string[]; yaml?: Record<string, unknown> }) {
    const message = `\n正确格式:\n  @${JSDocTagName.DEPRECATED}\n`;

    if (params.inline.length > 0 || params.yaml) {
      throw new Error(`@${JSDocTagName.DEPRECATED} 标签不应包含任何参数${message}`);
    }
  }

  /**
   * 构建解析结果。
   * @returns 构建的解析结果。
   */
  private buildResult(): OperationData {
    return { deprecated: true };
  }
}
