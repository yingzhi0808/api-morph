import type { CodeAnalyzer } from "./CodeAnalyzer";

/**
 * 代码分析器注册表，用于管理和查找代码分析器
 */
export class CodeAnalyzerRegistry {
  /** 所有注册的代码分析器 */
  private analyzers = new Set<CodeAnalyzer>();

  /**
   * 注册代码分析器
   * @param analyzer 代码分析器实例
   */
  register(analyzer: CodeAnalyzer) {
    if (this.analyzers.has(analyzer)) {
      throw new Error(`代码分析器名称冲突：分析器 "${analyzer.constructor.name}" 已经被注册。`);
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
