import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import type { HttpMethod } from "@/constants";
import { VALID_HTTP_METHODS } from "@/constants";
import { FrameworkAnalyzer } from "@/core";
import type { OperationData } from "@/types";

/**
 * Express框架分析器，用于分析Express应用的各种节点类型。
 * 支持分析如下模式：
 * - 路由调用: `app.get("/path", handler)`、`router.post("/path", handler)`
 * - 路由挂载: `app.use("/api", router)`
 */
export class ExpressFrameworkAnalyzer extends FrameworkAnalyzer {
  frameworkName = "Express";

  /**
   * 判断节点是否属于Express框架
   * @param node AST节点
   * @returns 如果属于Express框架返回true
   */
  canAnalyzeFramework(node: Node) {
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
   * 分析Express节点，内部分发到具体的节点类型处理方法
   * @param node AST节点
   * @returns 解析后的操作数据
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

  /**
   * 将 Express 路径参数格式转换为 OpenAPI 格式: `/users/:id` -> `/users/{id}`
   * @param expressPath Express格式的路径
   * @returns OpenAPI格式的路径
   */
  private convertExpressPathToOpenAPI(expressPath: string) {
    return expressPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
  }
}
