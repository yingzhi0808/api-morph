import { cloneDeep } from "radashi";
import type { Builder } from "@/builders/Builder";
import type { SecurityRequirementObject } from "@/types/openapi";

/**
 * 安全需求构建器，用于构建 OpenAPI SecurityRequirementObject
 *
 * @category Builders
 */
export class SecurityBuilder implements Builder<SecurityRequirementObject> {
  private security: SecurityRequirementObject = {};

  build() {
    return cloneDeep(this.security);
  }

  /**
   * 设置指定安全方案的作用域。
   * @param schemeName 安全方案名称（必须对应在 Components Object 中声明的安全方案）。
   * @param scopes 作用域数组（对于 oauth2 或 openIdConnect 类型，为所需的作用域名称；对于其他类型，为角色名称）。
   * @returns 安全需求构建器。
   */
  addScopes(schemeName: string, scopes: string[] = []) {
    const security = this.security;
    if (!security[schemeName]) {
      security[schemeName] = scopes;
    }
    return this;
  }
}
