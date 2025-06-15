import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import { VALID_HTTP_METHODS } from "@/constants";
import { ASTAnalyzerRegistry, FrameworkAnalyzer } from "@/core";
import type { OperationData, ParseContext } from "@/types";
import { ExpressRouteASTAnalyzer } from "./ExpressRouteASTAnalyzer";
import { ZodValidationASTAnalyzer } from "./ZodValidationASTAnalyzer";

/**
 * Express框架分析器，用于分析Express应用的各种节点类型。
 * 支持分析如下模式：
 * - 路由调用: `app.get("/path", handler)`、`router.post("/path", handler)`
 * - 路由挂载: `app.use("/api", router)`
 */
export class ExpressFrameworkAnalyzer extends FrameworkAnalyzer {
  frameworkName = "Express";

  private readonly astAnalyzerRegistry: ASTAnalyzerRegistry;

  constructor(context: ParseContext) {
    super(context);
    this.astAnalyzerRegistry = new ASTAnalyzerRegistry();
    this.astAnalyzerRegistry.register(new ExpressRouteASTAnalyzer(context));
    this.astAnalyzerRegistry.register(new ZodValidationASTAnalyzer(context));
  }

  /**
   * 判断节点是否属于Express框架
   * @param node AST节点
   * @returns 如果属于Express框架返回true
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

    // 检查是否是有效的HTTP方法
    if (!VALID_HTTP_METHODS.includes(methodName)) {
      return false;
    }

    // 检查调用对象是否为Express类型
    const objectExpression = propertyAccess.getFirstChild();
    if (!objectExpression) {
      return false;
    }

    return this.isExpressType(objectExpression);
  }

  /**
   * 分析Express节点，使用AST分析器注册表来获取不同的信息
   * @param node AST节点
   * @returns 解析后的操作数据
   */
  async analyze(node: Node) {
    const analyzers = this.astAnalyzerRegistry.getAllAnalyzers();
    const results = await Promise.all(analyzers.map((analyzer) => analyzer.analyze(node)));

    const operationData: OperationData = {};
    results.forEach((result) => {
      Object.assign(operationData, result);
    });

    return operationData;
  }

  /**
   * 检查节点是否为Express类型
   * @param node 要检查的节点
   * @returns 如果是Express类型返回true
   */
  private isExpressType(node: Node) {
    const nodeType = node.getType();
    const expressType = this.getExpressType();
    return nodeType.isAssignableTo(expressType);
  }

  /**
   * 获取 Express 的类型对象。
   * 通过创建虚拟文件导入Express类型来获取类型信息
   * @returns Express 的 Type 对象，如果获取失败则返回 null。
   */
  private getExpressType() {
    const project = this.context.project;

    const tempFileName = "__temp_express_resolve__.ts";
    const tempFile = project.createSourceFile(
      tempFileName,
      `
        import express from "express";
        const app = express();
      `,
    );

    try {
      const variableDeclaration = tempFile.getFirstDescendantByKindOrThrow(
        SyntaxKind.VariableDeclaration,
      );
      const type = variableDeclaration.getType();
      return type;
    } finally {
      project.removeSourceFile(tempFile);
    }
  }
}
