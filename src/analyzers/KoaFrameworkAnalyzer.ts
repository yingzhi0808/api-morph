import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import { VALID_HTTP_METHODS } from "@/constants";
import { CodeAnalyzerRegistry } from "@/registry/CodeAnalyzerRegistry";
import type { OperationData, ParseContext } from "@/types/parser";
import { FrameworkAnalyzer } from "./FrameworkAnalyzer";
import { KoaRouteCodeAnalyzer } from "./KoaRouteCodeAnalyzer";
import { KoaZodValidatorCodeAnalyzer } from "./KoaZodValidatorCodeAnalyzer";

/**
 * Koa框架分析器，用于分析Koa应用的各种节点类型。
 */
export class KoaFrameworkAnalyzer extends FrameworkAnalyzer {
  frameworkName = "Koa";

  private readonly codeAnalyzerRegistry: CodeAnalyzerRegistry;

  constructor(context: ParseContext) {
    super(context);
    this.codeAnalyzerRegistry = new CodeAnalyzerRegistry();

    const defaultAnalyzers = [KoaRouteCodeAnalyzer, KoaZodValidatorCodeAnalyzer];
    const analyzers = [...defaultAnalyzers, ...(context.options.customKoaCodeAnalyzers ?? [])];

    for (const analyzer of analyzers) {
      this.codeAnalyzerRegistry.register(new analyzer(this.context));
    }
  }

  /**
   * 判断节点是否属于Koa框架
   * @param node 代码节点
   * @returns 如果属于Koa框架返回true
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

    // 必须是Router类型 (@types/koa__router)
    const objectExpression = propertyAccess.getExpression();
    const isRouterType = this.isKoaRouterType(objectExpression);
    if (!isRouterType) {
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
   * 分析Koa节点，使用代码分析器注册表来获取不同的信息
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
   * 检查节点是否为Koa Router类型
   * @param node 要检查的节点
   * @returns 如果是Router类型返回true
   */
  private isKoaRouterType(node: Node) {
    const nodeType = node.getType();
    const typeSymbol = nodeType.getSymbol();

    // 检查是否是@types/koa__router的 Router 类型
    if (nodeType.getText().includes("@types/koa__router") && typeSymbol?.getName() === "Router") {
      return true;
    }

    return false;
  }
}
