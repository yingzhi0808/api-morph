import type { Node } from "ts-morph";
import type { ParseContext, ParsedTagData } from "@/types";

/**
 * AST分析器抽象基类，用于分析代码结构并提取API信息
 */
export abstract class ASTAnalyzer {
  /** 分析器名称，用于标识和调试 */
  abstract readonly name: string;

  /** 分析器优先级，数值越小优先级越高 */
  readonly priority: number = 100;

  /**
   * 创建AST分析器实例
   * @param context 解析上下文
   */
  constructor(protected readonly context: ParseContext) {}

  /**
   * 判断当前分析器是否能够分析给定的AST节点
   * @param node AST节点
   * @returns 如果能够分析返回true，否则返回false
   */
  abstract canAnalyze(node: Node): boolean;

  /**
   * 分析AST节点并提取API信息
   * @param node AST节点
   * @returns 解析后的标签数据，如果无法解析返回null
   */
  abstract analyze(node: Node): Promise<ParsedTagData | null>;

  /**
   * 获取分析器的描述信息，用于调试和日志
   * @returns 分析器描述
   */
  getDescription(): string {
    return `${this.name} AST Analyzer`;
  }
}
