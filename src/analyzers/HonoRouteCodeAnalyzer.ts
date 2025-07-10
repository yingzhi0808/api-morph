import { basename, extname } from "node:path";
import { pascal } from "radashi";
import type { CallExpression, Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import type { HttpMethod } from "@/types/common";
import type { OperationData } from "@/types/parser";
import { CodeAnalyzer } from "./CodeAnalyzer";

/**
 * Hono路由代码分析器，负责从Hono路由调用中分析HTTP方法、路径和operationId
 */
export class HonoRouteCodeAnalyzer extends CodeAnalyzer {
  /**
   * 分析Hono路由信息（方法、路径和operationId）
   */
  async analyze(node: Node): Promise<OperationData> {
    const expression = node.getFirstChildByKindOrThrow(SyntaxKind.CallExpression);
    const propertyAccess = expression.getFirstChildByKindOrThrow(
      SyntaxKind.PropertyAccessExpression,
    );

    const method = propertyAccess.getName() as HttpMethod;
    const args = expression.getArguments();

    // 计算route的最终路径
    let path = this.calculateRoutePath(expression) || "/";
    path = this.convertHonoPathToOpenAPI(path);

    // 解析 operationId
    let operationId: string | undefined;
    const functionName = this.extractHandlerName(args);
    // 如果用户提供了自定义生成函数，优先使用它
    if (this.context.options.generateOperationId) {
      const filePath = node.getSourceFile().getFilePath();
      const fileName = basename(filePath, extname(filePath));
      operationId =
        this.context.options.generateOperationId(method, path, fileName, functionName) || undefined;
    } else {
      // 否则使用默认逻辑：优先使用函数名，然后生成
      operationId = functionName ?? this.generateOperationIdFromRoute(method, path);
    }

    return {
      method,
      path,
      operationId,
    };
  }

  /**
   * 计算route的最终路径
   * @param callExpression route方法调用表达式
   * @returns 路由最终路径，如果没有找到则返回空字符串
   */
  private calculateRoutePath(callExpression: CallExpression): string {
    const args = callExpression.getArguments();

    const propertyAccess = callExpression.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
    if (!propertyAccess) {
      return "";
    }

    const identifier = propertyAccess.getExpression().asKindOrThrow(SyntaxKind.Identifier);
    const path = this.getStringValueFromNode(args[0]) || "";
    const basePath = identifier.getType().getTypeArguments()[2].getLiteralValue() as string;
    const mountPath = this.normalizePath(basePath) + this.normalizePath(path);

    let parentBasePath = "";

    const references = identifier.findReferencesAsNodes();
    for (const reference of references) {
      const parent = reference.getParentIfKind(SyntaxKind.CallExpression);
      if (!parent) {
        continue;
      }

      // 递归查找父级route的挂载路径
      parentBasePath = this.calculateRoutePath(parent);

      break;
    }

    return parentBasePath + mountPath;
  }

  /**
   * 规范化路径，确保路径以 / 开头，且不以 / 结尾
   * @param path 路径
   * @returns 规范化后的路径
   */
  private normalizePath(path: string) {
    // 确保路径格式正确
    if (path && !path.startsWith("/")) {
      path = `/${path}`;
    }
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    return path;
  }

  /**
   * 从 AST 节点中提取字符串字面量值
   * @param node 要提取字符串值的节点
   * @returns 字符串值，如果提取失败则返回undefined
   */
  private getStringValueFromNode(node: Node) {
    const nodeType = node.getType();

    if (nodeType.isString() || nodeType.isStringLiteral()) {
      return nodeType.getLiteralValue() as string;
    }

    return undefined;
  }

  /**
   * 将 Hono 路径参数格式转换为 OpenAPI 格式: `/users/:id` -> `/users/{id}`
   */
  private convertHonoPathToOpenAPI(path: string) {
    return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
  }

  /**
   * 从路由处理函数中提取函数名
   * @param args 参数
   * @returns 函数名，如果提取失败则返回 undefined
   */
  private extractHandlerName(args: Node[]) {
    // 查找最后一个函数参数（通常是处理函数）
    const handlerArg = args[args.length - 1];

    // 如果是函数表达式，查找函数名
    if (handlerArg.isKind(SyntaxKind.FunctionExpression)) {
      const functionName = handlerArg.getName();
      if (functionName) {
        return functionName;
      }
    }

    // 如果是标识符（函数引用）
    if (handlerArg.isKind(SyntaxKind.Identifier)) {
      return handlerArg.getText();
    }

    // 如果是属性访问表达式（如 controller.method）
    if (handlerArg.isKind(SyntaxKind.PropertyAccessExpression)) {
      const propertyName = handlerArg.getName();
      if (propertyName) {
        return propertyName;
      }
    }

    return undefined;
  }

  /**
   * 根据HTTP方法和路径生成operationId
   * @param method HTTP方法
   * @param path 路径
   * @returns 生成的operationId
   */
  private generateOperationIdFromRoute(method: string, path: string): string {
    // 移除路径参数的大括号，将路径转换为驼峰命名
    const pathParts = path
      .split("/")
      .filter((part) => part.length > 0)
      .map((part) => {
        // 移除参数大括号 {id} -> id，然后添加 "By" 前缀
        if (part.startsWith("{") && part.endsWith("}")) {
          const paramName = part.slice(1, -1);
          return `By${pascal(paramName)}`;
        }
        return pascal(part);
      });

    const pathString = pathParts.join("");
    return `${method}${pathString}`;
  }
}
