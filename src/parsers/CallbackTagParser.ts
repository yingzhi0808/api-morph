import type { JSDocTag } from "ts-morph";
import { z } from "zod/v4";
import { CallbackBuilder } from "@/builders";
import { JSDocTagName } from "@/constants";
import { TagParser } from "@/core";
import { getZodErrorMessage } from "@/helpers/zod";
import type { CallbackTagData, CallbackTagParams, ParsedTagData, ParsedTagParams } from "@/types";
import { isExtensionKey } from "@/utils";

/**
 * 回调标签解析器，处理 `@callback` 标签
 */
export class CallbackTagParser extends TagParser {
  tags = [JSDocTagName.CALLBACK];

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  async parse(tag: JSDocTag) {
    const params = await this.parseTagParamsWithYaml(tag);
    const transformedParams = this.transformParams(params);
    const validatedParams = this.validateParams(transformedParams);
    return this.buildCallback(validatedParams);
  }

  /**
   * 转换参数的钩子方法，子类可以重写此方法来完全控制参数转换。
   * @param params 参数对象。
   * @returns 转换后的参数对象。
   */
  protected transformParams(params: ParsedTagParams): Partial<CallbackTagParams> {
    const { inline, yaml } = params;
    const [callbackName] = inline;
    return { callbackName, yaml };
  }

  /**
   * 验证回调标签的参数。
   * @param params 参数对象。
   * @returns 验证后的参数对象。
   */
  protected validateParams(params: unknown) {
    const message =
      `\n正确格式:\n` +
      `  @${JSDocTagName.CALLBACK} <callbackName>\n` +
      `  [expression: string]: PathItemObject\n` +
      `  [key: \`x-\${string}\`]: any\n`;

    // @ts-ignore
    const schema: z.ZodType<CallbackTagData> = z.object({
      callbackName: z
        .string(`@${JSDocTagName.CALLBACK} 标签 callbackName 不能为空`)
        .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, {
          error: (iss) =>
            `@${JSDocTagName.CALLBACK} 标签 callbackName 格式不正确："${iss.input}"，必须是有效的标识符（以字母或下划线开头，只能包含字母、数字和下划线）`,
        }),
      yaml: z.record(z.string(), z.unknown(), `@${JSDocTagName.CALLBACK} 标签必须包含 YAML 参数`),
    });

    const { success, data, error } = schema.safeParse(params);
    if (!success) throw new Error(getZodErrorMessage(error) + message);
    return data;
  }

  /**
   * 构建回调对象。
   * @param params 回调参数。
   * @returns 构建的回调对象。
   */
  private buildCallback(params: CallbackTagData): ParsedTagData {
    const { callbackName, yaml } = params;
    const callbackBuilder = new CallbackBuilder();

    for (const [key, value] of Object.entries(yaml)) {
      if (isExtensionKey(key)) {
        callbackBuilder.addExtension(key, value);
      } else {
        callbackBuilder.addExpression(key, value);
      }
    }

    return {
      callback: {
        name: callbackName,
        callback: callbackBuilder.build(),
      },
    };
  }
}
