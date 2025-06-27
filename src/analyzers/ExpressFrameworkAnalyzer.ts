import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import { VALID_HTTP_METHODS } from "@/constants";
import { CodeAnalyzerRegistry } from "@/registry/CodeAnalyzerRegistry";
import type { OperationData, ParseContext } from "@/types/parser";
import { ExpressRouteCodeAnalyzer } from "./ExpressRouteCodeAnalyzer";
import { ExpressZodValidationCodeAnalyzer } from "./ExpressZodValidationCodeAnalyzer";
import { FrameworkAnalyzer } from "./FrameworkAnalyzer";

/**
 * Express框架分析器，用于分析Express应用的各种节点类型。
 */
export class ExpressFrameworkAnalyzer extends FrameworkAnalyzer {
  frameworkName = "Express";

  private readonly codeAnalyzerRegistry: CodeAnalyzerRegistry;

  constructor(context: ParseContext) {
    super(context);
    this.codeAnalyzerRegistry = new CodeAnalyzerRegistry();

    const defaultAnalyzers = [ExpressRouteCodeAnalyzer, ExpressZodValidationCodeAnalyzer];
    const analyzers = [...defaultAnalyzers, ...(context.options.customExpressCodeAnalyzers ?? [])];

    for (const analyzer of analyzers) {
      this.codeAnalyzerRegistry.register(new analyzer(this.context));
    }
  }

  /**
   * 判断节点是否属于Express框架
   * @param node 代码节点
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
   * 分析Express节点，使用代码分析器注册表来获取不同的信息
   * @param node 代码节点
   * @returns 解析后的操作数据
   */
  async analyze(node: Node) {
    const analyzers = this.codeAnalyzerRegistry.getAllAnalyzers();
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
    const typeSymbol = nodeType.getSymbol();

    return typeSymbol?.getName() === "Express";
  }
}
