import type { Node } from "ts-morph";
import type { ASTAnalyzer } from "./ASTAnalyzer";

/**
 * AST分析器注册表，用于管理和查找AST分析器
 */
export class ASTAnalyzerRegistry {
  /** 所有已注册的分析器列表 */
  private analyzers: ASTAnalyzer[] = [];
  /** 分析器名称到实例的映射 */
  private analyzerMap = new Map<string, ASTAnalyzer>();

  /**
   * 注册AST分析器
   * @param analyzer AST分析器实例
   * @throws {Error} 如果分析器名称冲突
   */
  register(analyzer: ASTAnalyzer) {
    if (this.analyzerMap.has(analyzer.name)) {
      throw new Error(`AST分析器名称冲突：分析器 "${analyzer.name}" 已经被注册。`);
    }

    this.analyzers.push(analyzer);
    this.analyzerMap.set(analyzer.name, analyzer);

    // 按优先级排序，优先级数值越小越靠前
    this.analyzers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取能够分析指定节点的所有分析器
   * @param node AST节点
   * @returns 能够分析该节点的分析器数组，按优先级排序
   */
  getAnalyzers(node: Node): ASTAnalyzer[] {
    return this.analyzers.filter((analyzer) => analyzer.canAnalyze(node));
  }

  /**
   * 根据名称获取分析器
   * @param name 分析器名称
   * @returns 分析器实例，如果不存在返回undefined
   */
  getAnalyzer(name: string): ASTAnalyzer | undefined {
    return this.analyzerMap.get(name);
  }

  /**
   * 检查是否存在指定名称的分析器
   * @param name 分析器名称
   * @returns 如果存在返回true，否则返回false
   */
  hasAnalyzer(name: string): boolean {
    return this.analyzerMap.has(name);
  }

  /**
   * 获取所有已注册的分析器名称
   * @returns 分析器名称数组
   */
  getAllAnalyzerNames(): string[] {
    return Array.from(this.analyzerMap.keys());
  }

  /**
   * 获取所有已注册的分析器
   * @returns 分析器数组，按优先级排序
   */
  getAllAnalyzers(): ASTAnalyzer[] {
    return [...this.analyzers];
  }

  /**
   * 清空所有已注册的分析器
   */
  clear() {
    this.analyzers = [];
    this.analyzerMap.clear();
  }

  /**
   * 获取注册的分析器数量
   * @returns 分析器数量
   */
  size(): number {
    return this.analyzers.length;
  }
}
