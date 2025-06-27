import type { JSDocTag } from "ts-morph";
import z from "zod/v4";
import { VALID_HTTP_METHODS } from "@/constants";
import { getZodErrorMessage } from "@/helpers/zod";
import { type HttpMethod, JSDocTagName } from "@/types/common";
import type { OperationData } from "@/types/parser";
import type { ParsedTagParams } from "./TagParser";
import { TagParser } from "./TagParser";

/**
 * 操作标签解析器，处理 `@operation` 标签
 *
 * @category Parsers
 */
export class OperationTagParser extends TagParser {
  tags: string[] = [JSDocTagName.OPERATION];

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
    const [method, path] = inline;
    return { method: method?.toLowerCase(), path };
  }

  /**
   * 验证操作标签的参数。
   * @param params 参数对象。
   * @returns 验证后的参数对象。
   */
  private validateParams(params: unknown) {
    const message = `\n正确格式:\n  @${JSDocTagName.OPERATION} <METHOD> <path>\n`;

    const schema = z.object({
      method: z.enum(VALID_HTTP_METHODS as HttpMethod[], {
        error: (iss) =>
          iss.input === undefined
            ? `@${JSDocTagName.OPERATION} 标签 method 不能为空`
            : `@${JSDocTagName.OPERATION} 标签包含不支持的 HTTP 方法："${iss.input}"，支持的方法有：${VALID_HTTP_METHODS.join(", ")}`,
      }),
      path: z.string(`@${JSDocTagName.OPERATION} 标签 path 不能为空`).startsWith("/", {
        error: (iss) =>
          `@${JSDocTagName.OPERATION} 标签 path 格式不正确："${iss.input}"，路径必须以 "/" 开头`,
      }),
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
  private buildResult(params: { method: HttpMethod; path: string }): OperationData {
    return params;
  }
}
