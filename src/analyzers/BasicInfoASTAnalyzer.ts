import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import type { HttpMethod } from "@/constants";
import { ASTAnalyzer } from "@/core";
import type { OperationData } from "@/types";

/**
 * 基础信息分析结果
 */
export interface BasicInfo {
  method: HttpMethod;
  path: string;
}

/**
 * 基础信息AST分析器，负责从Express路由调用中分析HTTP方法和路径
 */
export class BasicInfoASTAnalyzer extends ASTAnalyzer {
  name = "BasicInfoASTAnalyzer";

  /**
   * 分析基础信息（方法和路径）
   */
  async analyze(node: Node): Promise<OperationData> {
    const expression = node.getFirstChildByKind(SyntaxKind.CallExpression);
    const propertyAccess = expression?.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
    const identifier = propertyAccess?.getLastChildByKind(SyntaxKind.Identifier);

    const args = expression?.getArguments();
    const pathArg = args?.[0];

    let path: string | undefined;
    if (
      pathArg?.isKind(SyntaxKind.StringLiteral) ||
      pathArg?.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)
    ) {
      path = pathArg?.getText().slice(1, -1);
    }

    // OpenAPI 规范要求路径必须以 / 开头
    if (path && !path.startsWith("/")) {
      path = `/${path}`;
    }

    if (path) {
      path = this.convertExpressPathToOpenAPI(path);
    }

    let method: HttpMethod | undefined;
    if (identifier) {
      method = identifier.getText() as HttpMethod;
    }

    return {
      method,
      path,
    };
  }

  /**
   * 将 Express 路径参数格式转换为 OpenAPI 格式: `/users/:id` -> `/users/{id}`
   */
  private convertExpressPathToOpenAPI(expressPath: string): string {
    return expressPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
  }
}
