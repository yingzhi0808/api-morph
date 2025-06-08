import type { JSDocTag } from "ts-morph";
import z from "zod/v4";
import { JSDocTagName } from "@/constants";
import { TagParser } from "@/core";
import { getZodErrorMessage } from "@/helpers";
import type { ParsedTagData, ParsedTagParams } from "@/types";

/**
 * 操作ID解析器，处理 `@operationId` 标签
 */
export class OperationIdTagParser extends TagParser {
  tags: string[] = [JSDocTagName.OPERATION_ID];

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
    const [operationId] = inline;
    return { operationId };
  }

  /**
   * 验证操作ID标签的参数。
   * @param params 参数对象。
   * @returns 验证后的参数对象。
   */
  private validateParams(params: unknown) {
    const message = `\n正确格式:\n  @${JSDocTagName.OPERATION_ID} <operationId>\n`;

    const schema = z.object({
      operationId: z
        .string(`@${JSDocTagName.OPERATION_ID} 标签 operationId 不能为空`)
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
          error: (iss) =>
            `@${JSDocTagName.OPERATION_ID} 标签 operationId 格式不正确："${iss.input}"，操作ID必须是有效的标识符（以字母或下划线开头，只能包含字母、数字和下划线）`,
        }),
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
  private buildResult(params: { operationId: string }): ParsedTagData {
    return params;
  }
}
