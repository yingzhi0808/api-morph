/* v8 ignore start */

import type { Node } from "ts-morph";
import type { OperationData, ParseContext } from "@/types";

/**
 * 框架分析器抽象基类，用于分析特定框架的代码结构并提取API信息
 */
export abstract class FrameworkAnalyzer {
  /** 框架名称，用于调试和日志 */
  abstract readonly frameworkName: string;

  /**
   * 创建框架分析器实例
   * @param context 解析上下文
   */
  constructor(protected readonly context: ParseContext) {}

  /**
   * 判断当前节点是否属于该框架
   * @param node AST节点
   * @returns 如果属于该框架返回true，否则返回false
   */
  abstract canAnalyze(node: Node): boolean;

  /**
   * 分析框架节点并提取API信息
   * 内部会根据节点类型分发到具体的分析方法
   * @param node AST节点
   * @returns 解析后的操作数据，如果无法解析返回null
   */
  abstract analyze(node: Node): Promise<OperationData | null> | OperationData | null;
}
