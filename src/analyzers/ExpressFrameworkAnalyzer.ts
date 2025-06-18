import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import { VALID_HTTP_METHODS } from "@/constants";
import { ASTAnalyzerRegistry } from "@/core/ASTAnalyzerRegistry";
import { FrameworkAnalyzer } from "@/core/FrameworkAnalyzer";
import type { OperationData, ParseContext } from "@/types";
import { ExpressRouteASTAnalyzer } from "./ExpressRouteASTAnalyzer";
import { ExpressZodValidationASTAnalyzer } from "./ExpressZodValidationASTAnalyzer";

/**
 * Express框架分析器，用于分析Express应用的各种节点类型。
 */
export class ExpressFrameworkAnalyzer extends FrameworkAnalyzer {
  frameworkName = "Express";

  private readonly astAnalyzerRegistry: ASTAnalyzerRegistry;

  constructor(context: ParseContext) {
    super(context);
    this.astAnalyzerRegistry = new ASTAnalyzerRegistry();

    const defaultAnalyzers = [ExpressRouteASTAnalyzer, ExpressZodValidationASTAnalyzer];
    const analyzers = [...defaultAnalyzers, ...(context.options.customExpressASTAnalyzers ?? [])];

    for (const analyzer of analyzers) {
      this.astAnalyzerRegistry.register(new analyzer(this.context));
    }
  }

  /**
   * 判断节点是否属于Express框架
   * @param node AST节点
   * @returns 如果属于Express框架返回true
   */
  canAnalyze(node: Node) {
    // 必须是表达式语句
    if (!node.isKind(SyntaxKind.ExpressionStatement)) {
      return false;
    }

    // 必须是函数调用
    const expression = node.getFirstChildByKind(SyntaxKind.CallExpression);
    if (!expression) {
      return false;
    }

    // 必须是属性访问表达式
    const propertyAccess = expression.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
    if (!propertyAccess) {
      return false;
    }

    // 必须是有效的HTTP方法
    const methodName = propertyAccess.getName();
    if (!VALID_HTTP_METHODS.includes(methodName)) {
      return false;
    }

    // 必须是Express类型
    const objectExpression = propertyAccess.getExpression();
    const isExpressType = this.isExpressType(objectExpression);
    if (!isExpressType) {
      return false;
    }

    // 必须有两个参数
    const args = expression.getArguments();
    if (args.length < 2) {
      return false;
    }

    // 路径参数必须是字符串字面量
    const pathArg = args[0];
    if (
      !pathArg.isKind(SyntaxKind.StringLiteral) &&
      !pathArg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)
    ) {
      return false;
    }

    return true;
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
