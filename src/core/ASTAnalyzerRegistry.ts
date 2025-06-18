import type { ASTAnalyzer } from "./ASTAnalyzer";

/**
 * AST分析器注册表，用于管理和查找AST分析器
 */
export class ASTAnalyzerRegistry {
  /** 所有注册的AST分析器 */
  private analyzers = new Set<ASTAnalyzer>();

  /**
   * 注册AST分析器
   * @param analyzer AST分析器实例
   */
  register(analyzer: ASTAnalyzer) {
    if (this.analyzers.has(analyzer)) {
      throw new Error(`AST分析器名称冲突：分析器 "${analyzer.constructor.name}" 已经被注册。`);
    }

    this.analyzers.add(analyzer);
  }

  /**
   * 获取所有注册的分析器
   * @returns 所有分析器数组
   */
  getAllAnalyzers() {
    return Array.from(this.analyzers);
  }
}
