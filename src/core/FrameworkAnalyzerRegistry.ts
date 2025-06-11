import type { Node } from "ts-morph";
import type { FrameworkAnalyzer } from "./FrameworkAnalyzer";

/**
 * 框架分析器注册表，用于管理和查找框架分析器
 */
export class FrameworkAnalyzerRegistry {
  /** 框架名称到分析器实例的映射 */
  private nameToAnalyzer = new Map<string, FrameworkAnalyzer>();

  /**
   * 注册框架分析器
   * @param analyzer 框架分析器实例
   */
  register(analyzer: FrameworkAnalyzer) {
    if (this.nameToAnalyzer.has(analyzer.frameworkName)) {
      throw new Error(`框架分析器名称冲突：框架 "${analyzer.frameworkName}" 已经被注册。`);
    }

    this.nameToAnalyzer.set(analyzer.frameworkName, analyzer);
  }

  /**
   * 按注册顺序尝试每个框架分析器，返回第一个能够处理的结果
   * @param node AST节点
   * @returns 第一个能够处理该节点的框架分析器，如果没有找到返回null
   */
  getFirstMatchingAnalyzer(node: Node) {
    for (const analyzer of this.nameToAnalyzer.values()) {
      if (analyzer.canAnalyze(node)) {
        return analyzer;
      }
    }
    return null;
  }

  /**
   * 获取所有注册的框架分析器
   * @returns 所有框架分析器的数组
   */
  getAllAnalyzers() {
    return Array.from(this.nameToAnalyzer.values());
  }
}
