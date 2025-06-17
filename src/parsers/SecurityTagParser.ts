import type { JSDocTag } from "ts-morph";
import z from "zod/v4";
import { SecurityBuilder } from "@/builders";
import { JSDocTagName } from "@/constants";
import { TagParser } from "@/core/TagParser";
import { getZodErrorMessage } from "@/helpers";
import type { OperationData, ParsedTagParams, SecurityTagData, SecurityTagParams } from "@/types";

/**
 * 安全标签解析器，处理 `@security` 标签
 */
export class SecurityTagParser extends TagParser {
  tags: string[] = [JSDocTagName.SECURITY];

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  async parse(tag: JSDocTag) {
    const params = await this.parseTagParamsWithYaml(tag);
    const transformedParams = this.transformParams(params);
    const validatedParams = this.validateParams(transformedParams);
    return this.buildSecurity(validatedParams);
  }

  /**
   * 转换参数的钩子方法，子类可以重写此方法来完全控制参数转换。
   * @param params 参数对象。
   * @returns 转换后的参数对象。
   */
  protected transformParams(params: ParsedTagParams): Partial<SecurityTagParams> {
    const { inline } = params;
    const [schemeName, ...scopes] = inline;
    return { schemeName, scopes };
  }

  /**
   * 验证安全标签的参数。
   * @param params 参数对象。
   * @returns 转换后的参数对象。
   */
  private validateParams(params: unknown) {
    const message = `\n正确格式：\n  @${JSDocTagName.SECURITY} <schemeName> [...scopes]\n`;

    const schema: z.ZodType<SecurityTagData> = z.object({
      schemeName: z.string(`@${JSDocTagName.SECURITY} 标签 schemeName 不能为空`),
      scopes: z.array(z.string()).optional(),
    });

    const { success, data, error } = schema.safeParse(params);
    if (!success) {
      throw new Error(getZodErrorMessage(error) + message);
    }
    return data;
  }

  /**
   * 构建安全需求。
   * @param params 安全需求参数。
   * @returns 解析结果。
   */
  private buildSecurity(params: SecurityTagData): OperationData {
    const { schemeName, scopes } = params;
    const securityBuilder = new SecurityBuilder();
    securityBuilder.addScopes(schemeName, scopes);

    return {
      security: securityBuilder.build(),
    };
  }
}
