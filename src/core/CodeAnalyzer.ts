/* v8 ignore start */

import type { Node } from "ts-morph";
import type { OperationData, ParseContext } from "@/types";

/**
 * 代码分析器抽象基类，用于分析代码结构并提取API信息
 */
export abstract class CodeAnalyzer {
  /**
   * 创建代码分析器实例
   * @param context 解析上下文
   */
  constructor(protected readonly context: ParseContext) {}

  /**
   * 分析代码节点并提取API信息
   * @param node 代码节点
   * @returns 解析后的操作数据
   */
  abstract analyze(node: Node): Promise<OperationData> | OperationData;
}
