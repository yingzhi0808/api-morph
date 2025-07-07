import { basename, extname } from "node:path";
import { pascal } from "radashi";
import type { LeftHandSideExpression, Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import type { HttpMethod } from "@/types/common";
import type { OperationData } from "@/types/parser";
import { CodeAnalyzer } from "./CodeAnalyzer";

/**
 * 路由代码分析器，负责从Express路由调用中分析HTTP方法、路径和operationId
 */
export class ExpressRouteCodeAnalyzer extends CodeAnalyzer {
  /**
   * 分析路由信息（方法、路径和operationId）
   */
  async analyze(node: Node): Promise<OperationData> {
    const expression = node.getFirstChildByKindOrThrow(SyntaxKind.CallExpression);
    const propertyAccess = expression.getFirstChildByKindOrThrow(
      SyntaxKind.PropertyAccessExpression,
    );

    const method = propertyAccess.getName() as HttpMethod;

    const args = expression.getArguments();
    let path = args[0].getText().slice(1, -1);

    // OpenAPI 规范要求路径必须以 / 开头
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }

    // 查找Router的完整挂载路径
    const objectExpression = propertyAccess.getExpression();
    const basePath = this.findRouterBasePath(objectExpression);

    // 如果找到了基础路径，拼接完整路径
    if (basePath) {
      path = basePath + path;
    }

    path = this.convertExpressPathToOpenAPI(path);

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
   * 查找Router的完整挂载路径，支持嵌套Router
   * @param objectExpression Router对象表达式
   * @returns 完整的基础路径，如果没有找到则返回空字符串
   */
  private findRouterBasePath(objectExpression: LeftHandSideExpression): string {
    const routerIdentifier = objectExpression.asKindOrThrow(SyntaxKind.Identifier);
    const references = routerIdentifier.findReferencesAsNodes();

    for (const reference of references) {
      const parent = reference.getParentIfKind(SyntaxKind.CallExpression);
      if (!parent) {
        continue;
      }

      // 检查是否是 use 方法调用
      const propertyAccess = parent.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
      if (!propertyAccess || propertyAccess.getName() !== "use") {
        continue;
      }

      const args = parent.getArguments();

      let mountPath = "";
      const pathArg = args[0];

      // 如果第一个参数是字符串，并且不是当前Router，则视为路径
      if (
        args.length > 1 &&
        (pathArg.isKind(SyntaxKind.StringLiteral) ||
          pathArg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral))
      ) {
        mountPath = pathArg.getLiteralText();
      }

      // 确保路径格式正确
      if (mountPath && !mountPath.startsWith("/")) {
        mountPath = `/${mountPath}`;
      }
      if (mountPath.endsWith("/")) {
        mountPath = mountPath.slice(0, -1);
      }

      // 递归查找父级Router的基础路径
      const mountTarget = propertyAccess.getExpression();
      const parentBasePath = this.findRouterBasePath(mountTarget);

      // 返回拼接后的完整路径
      return parentBasePath + mountPath;
    }

    return "";
  }

  /**
   * 将 Express 路径参数格式转换为 OpenAPI 格式: `/users/:id` -> `/users/{id}`
   */
  private convertExpressPathToOpenAPI(path: string) {
    return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
  }

  /**
   * 从路由处理函数中提取函数名
   * @param args 参数
   * @returns 函数名，如果提取失败则返回 undefined
   */
  private extractHandlerName(args: Node[]) {
    // 查找最后一个参数（通常是处理函数）
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
   * @returns operationId
   */
  private generateOperationIdFromRoute(method: HttpMethod, path: string) {
    // 清理路径：移除开头的斜杠，将路径分段
    const cleanPath = path.slice(1);
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
