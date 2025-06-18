/* v8 ignore start */

import type { Node } from "ts-morph";
import type { OperationData, ParseContext } from "@/types";

/**
 * AST分析器抽象基类，用于分析代码结构并提取API信息
 */
export abstract class ASTAnalyzer {
  /**
   * 创建AST分析器实例
   * @param context 解析上下文
   */
  constructor(protected readonly context: ParseContext) {}

  /**
   * 分析AST节点并提取API信息
   * @param node AST节点
   * @returns 解析后的操作数据
   */
  abstract analyze(node: Node): Promise<OperationData> | OperationData;
}
