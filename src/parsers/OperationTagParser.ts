import type { JSDocTag } from "ts-morph";
import z from "zod/v4";
import { type HttpMethod, JSDocTagName, VALID_HTTP_METHODS } from "@/constants";
import { TagParser } from "@/core/TagParser";
import { getZodErrorMessage } from "@/helpers";
import type { OperationData, ParsedTagParams } from "@/types";

/**∏
 * 操作标签解析器，处理 `@operation` 标签
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

    if (inline.length === 0) {
      return {};
    }

    if (inline.length === 1) {
      const param = inline[0];
      // 如果参数以 / 开头，认为是路径
      if (param.startsWith("/")) {
        return { path: param };
      }
      // 如果参数是有效的HTTP方法，认为是方法
      if (VALID_HTTP_METHODS.includes(param.toLowerCase())) {
        return { method: param.toLowerCase() };
      }
      // 否则按原来的逻辑处理（第一个参数作为method）
      return { method: param };
    }

    // 两个或更多参数时，按原来的逻辑处理
    const [method, path] = inline;
    return { method, path };
  }

  /**
   * 验证操作标签的参数。
   * @param params 参数对象。
   * @returns 验证后的参数对象。
   */
  private validateParams(params: unknown) {
    const message = `\n正确格式:\n  @${JSDocTagName.OPERATION} <METHOD> <path>\n`;

    // 当启用AST分析时，允许method和path为空，因为可以从AST中获取
    if (this.context.options.enableASTAnalysis) {
      const schema = z.object({
        method: z
          .enum(VALID_HTTP_METHODS as HttpMethod[], {
            error: (iss) =>
              iss.input === undefined
                ? `@${JSDocTagName.OPERATION} 标签 method 不能为空`
                : `@${JSDocTagName.OPERATION} 标签包含不支持的 HTTP 方法："${iss.input}"，支持的方法有：${VALID_HTTP_METHODS.join(", ")}`,
          })
          .optional(),
        path: z
          .string(`@${JSDocTagName.OPERATION} 标签 path 不能为空`)
          .startsWith("/", {
            error: (iss) =>
              `@${JSDocTagName.OPERATION} 标签 path 格式不正确："${iss.input}"，路径必须以 "/" 开头`,
          })
          .optional(),
      });

      const { success, data, error } = schema.safeParse(params);
      if (!success) {
        throw new Error(getZodErrorMessage(error) + message);
      }
      return data;
    } else {
      // 当未启用AST分析时，method和path必须提供
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
  }

  /**
   * 构建解析结果。
   * @param params 验证后的参数。
   * @returns 构建的解析结果。
   */
  private buildResult(params: { method?: HttpMethod; path?: string }): OperationData {
    return params;
  }
}
