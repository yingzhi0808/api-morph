import { basename, extname } from "node:path";
import { pascal } from "radashi";
import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import type { HttpMethod } from "@/constants";
import { ASTAnalyzer } from "@/core";
import type { OperationData } from "@/types";

/**
 * 路由信息分析结果
 */
export interface RouteInfo {
  method: HttpMethod;
  path: string;
  operationId?: string;
}

/**
 * 路由AST分析器，负责从Express路由调用中分析HTTP方法、路径和operationId
 *
 * 解析规则：
 * 1. 解析 HTTP 方法和路径
 * 2. 如果用户提供了自定义生成函数，优先使用它（传入方法、路径和函数名）
 * 3. 否则使用默认逻辑：
 *    - 优先查找路由处理函数的名称作为 operationId
 *    - 如果没有函数名，根据 HTTP 方法和路径生成：{method}{PathInCamelCase}
 *    - 路径参数会被转换为驼峰命名：/users/:id -> getUsersById
 * 4. 自定义函数可以返回 null 表示不生成 operationId
 */
export class ExpressRouteASTAnalyzer extends ASTAnalyzer {
  name = "ExpressRouteASTAnalyzer";

  /**
   * 分析路由信息（方法、路径和operationId）
   */
  async analyze(node: Node): Promise<OperationData> {
    const expression = node.getFirstChildByKind(SyntaxKind.CallExpression);
    const propertyAccess = expression?.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
    const identifier = propertyAccess?.getLastChildByKind(SyntaxKind.Identifier);

    const args = expression?.getArguments();

    if (!args || args.length < 2) {
      return {};
    }
    const pathArg = args[0];

    // 解析路径
    let path: string | undefined;
    if (
      pathArg.isKind(SyntaxKind.StringLiteral) ||
      pathArg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)
    ) {
      path = pathArg.getText().slice(1, -1);
    }

    // OpenAPI 规范要求路径必须以 / 开头
    if (path && !path.startsWith("/")) {
      path = `/${path}`;
    }

    if (path) {
      path = this.convertExpressPathToOpenAPI(path);
    }

    // 解析 HTTP 方法
    let method: HttpMethod | undefined;
    if (identifier) {
      method = identifier.getText() as HttpMethod;
    }

    // 解析 operationId
    let operationId: string | undefined;
    if (method && path) {
      const functionName = this.extractHandlerName(args);
      // 如果用户提供了自定义生成函数，优先使用它
      if (this.context.options.generateOperationId) {
        const filePath = node.getSourceFile().getFilePath();
        const fileName = basename(filePath, extname(filePath));
        operationId =
          this.context.options.generateOperationId(method, path, fileName, functionName) ||
          undefined;
      } else {
        // 否则使用默认逻辑：优先使用函数名，然后生成
        operationId =
          this.extractHandlerName(args) ?? this.generateOperationIdFromRoute(method, path);
      }
    }

    return {
      method,
      path,
      operationId,
    };
  }

  /**
   * 将 Express 路径参数格式转换为 OpenAPI 格式: `/users/:id` -> `/users/{id}`
   */
  private convertExpressPathToOpenAPI(expressPath: string) {
    return expressPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
  }

  /**
   * 从路由处理函数中提取函数名
   */
  private extractHandlerName(args: Node[]) {
    // 查找最后一个参数（通常是处理函数）
    const handlerArg = args[args.length - 1];

    // 如果是函数表达式，查找函数名
    if (handlerArg.isKind(SyntaxKind.FunctionExpression)) {
      const nameNode = handlerArg.getNameNode();
      if (nameNode) {
        return nameNode.getText();
      }
    }

    // 如果是标识符（函数引用）
    if (handlerArg.isKind(SyntaxKind.Identifier)) {
      return handlerArg.getText();
    }

    // 如果是属性访问表达式（如 controller.method）
    if (handlerArg.isKind(SyntaxKind.PropertyAccessExpression)) {
      const property = handlerArg.getLastChildByKind(SyntaxKind.Identifier);
      if (property) {
        return property.getText();
      }
    }

    return undefined;
  }

  /**
   * 根据HTTP方法和路径生成operationId
   */
  private generateOperationIdFromRoute(method: HttpMethod, path: string) {
    // 清理路径：移除开头的斜杠，将路径分段
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    const segments = cleanPath.split("/").filter((segment) => segment.length > 0);

    // 转换路径段为驼峰命名
    const pathParts = segments.map((segment) => {
      // 处理路径参数 {id} -> ById
      if (segment.startsWith("{") && segment.endsWith("}")) {
        const paramName = segment.slice(1, -1);
        return `By${pascal(paramName)}`;
      }
      // 普通路径段转为PascalCase
      return pascal(segment);
    });

    // 组合方法名和路径
    const methodName = method.toLowerCase();
    const pathName = pathParts.join("");

    return methodName + pathName;
  }
}
