import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import { VALID_HTTP_METHODS } from "@/constants";
import { CodeAnalyzerRegistry } from "@/registry/CodeAnalyzerRegistry";
import type { OperationData, ParseContext } from "@/types/parser";
import { FrameworkAnalyzer } from "./FrameworkAnalyzer";
import { HonoRouteCodeAnalyzer } from "./HonoRouteCodeAnalyzer";
import { HonoZodValidatorCodeAnalyzer } from "./HonoZodValidatorCodeAnalyzer";

/**
 * Hono框架分析器，用于分析Hono应用的各种节点类型。
 */
export class HonoFrameworkAnalyzer extends FrameworkAnalyzer {
  frameworkName = "Hono";

  private readonly codeAnalyzerRegistry: CodeAnalyzerRegistry;

  constructor(context: ParseContext) {
    super(context);
    this.codeAnalyzerRegistry = new CodeAnalyzerRegistry();

    const defaultAnalyzers = [HonoRouteCodeAnalyzer, HonoZodValidatorCodeAnalyzer];
    const analyzers = [...defaultAnalyzers, ...(context.options.customHonoCodeAnalyzers ?? [])];

    for (const analyzer of analyzers) {
      this.codeAnalyzerRegistry.register(new analyzer(this.context));
    }
  }

  /**
   * 判断节点是否属于Hono框架
   * @param node 代码节点
   * @returns 如果属于Hono框架返回true
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

    // 必须是Hono类型
    const objectExpression = propertyAccess.getExpression();
    const isHonoAppType = this.isHonoAppType(objectExpression);
    if (!isHonoAppType) {
      return false;
    }

    // 必须有至少两个参数 (路径和处理函数)
    const args = expression.getArguments();
    if (args.length < 2) {
      return false;
    }

    // 路径参数必须是字符串类型
    const pathArg = args[0];
    const pathArgType = pathArg.getType();
    if (!pathArgType.isString() && !pathArgType.isStringLiteral()) {
      return false;
    }

    return true;
  }

  /**
   * 分析Hono节点，使用代码分析器注册表来获取不同的信息
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
   * 检查节点是否为Hono类型
   * @param node 要检查的节点
   * @returns 如果是Hono类型返回true
   */
  private isHonoAppType(node: Node) {
    const nodeType = node.getType();
    const typeSymbol = nodeType.getSymbol();

    // 检查是否是 Hono 类型
    return nodeType.getText().includes("hono") && typeSymbol?.getName() === "Hono";
  }
}
