import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import type { HttpMethod } from "@/constants";
import { VALID_HTTP_METHODS } from "@/constants";
import { ASTAnalyzer } from "@/core";
import type { OperationData } from "@/types";

/**
 * Express路由分析器，用于分析Express应用的路由定义
 * 支持分析如下模式：
 * - app.get("/path", handler)
 * - app.post("/path", handler)
 * - router.put("/path", handler)
 * - ...
 */
export class ExpressRouteAnalyzer extends ASTAnalyzer {
  name = "ExpressRoute";

  /**
   * 将Express路径参数格式转换为OpenAPI格式，
   * Express格式: /users/:id/posts/:postId，
   * OpenAPI格式: /users/{id}/posts/{postId}
   * @param expressPath Express格式的路径
   * @returns OpenAPI格式的路径
   */
  private convertExpressPathToOpenAPI(expressPath: string) {
    return expressPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
  }

  /**
   * 判断节点是否是Express路由调用
   * @param node AST节点
   * @returns 如果是Express路由调用返回true
   */
  canAnalyze(node: Node) {
    if (!node.isKind(SyntaxKind.ExpressionStatement)) {
      return false;
    }

    const expression = node.getFirstChildByKind(SyntaxKind.CallExpression);
    if (!expression) {
      return false;
    }

    const propertyAccess = expression.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
    if (!propertyAccess) {
      return false;
    }

    const methodName = propertyAccess.getLastChildByKind(SyntaxKind.Identifier)?.getText();
    if (!methodName) {
      return false;
    }

    return VALID_HTTP_METHODS.includes(methodName);
  }

  /**
   * 分析Express路由定义
   * @param node AST节点
   * @returns 解析后的路由信息
   */
  async analyze(node: Node): Promise<OperationData | null> {
    const expression = node.getFirstChildByKind(SyntaxKind.CallExpression);
    if (!expression) {
      return null;
    }

    const propertyAccess = expression.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
    if (!propertyAccess) {
      return null;
    }

    const methodName = propertyAccess.getLastChildByKind(SyntaxKind.Identifier)?.getText();
    if (!methodName || !VALID_HTTP_METHODS.includes(methodName)) {
      return null;
    }

    const args = expression.getArguments();
    if (args.length < 2) {
      return null;
    }

    const pathArg = args[0];
    let path: string | null = null;

    if (
      pathArg.isKind(SyntaxKind.StringLiteral) ||
      pathArg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)
    ) {
      path = pathArg.getText().slice(1, -1);
    } else {
      return null;
    }

    if (!path) {
      return null;
    }

    // OpenAPI 规范要求路径必须以 / 开头
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }

    // 将Express路径参数格式转换为OpenAPI格式
    path = this.convertExpressPathToOpenAPI(path);

    return {
      method: methodName as HttpMethod,
      path,
    };
  }
}
