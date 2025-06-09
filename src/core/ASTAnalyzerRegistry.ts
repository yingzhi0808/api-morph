import type { Node } from "ts-morph";
import type { ASTAnalyzer } from "./ASTAnalyzer";

/**
 * AST分析器注册表，用于管理和查找AST分析器
 */
export class ASTAnalyzerRegistry {
  /** 分析器名称到实例的映射 */
  private nameToAnalyzer = new Map<string, ASTAnalyzer>();

  /**
   * 注册AST分析器
   * @param analyzer AST分析器实例
   */
  register(analyzer: ASTAnalyzer) {
    if (this.nameToAnalyzer.has(analyzer.name)) {
      throw new Error(`AST分析器名称冲突：分析器 "${analyzer.name}" 已经被注册。`);
    }

    this.nameToAnalyzer.set(analyzer.name, analyzer);
  }

  /**
   * 获取能够分析指定节点的所有分析器
   * @param node AST节点
   * @returns 能够分析该节点的分析器数组
   */
  getAnalyzers(node: Node) {
    return Array.from(this.nameToAnalyzer.values()).filter((analyzer) => analyzer.canAnalyze(node));
  }
}
