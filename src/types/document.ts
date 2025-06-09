import type { ParserOptions } from "@/types";

/**
 * generateDocument 的选项配置
 */
export interface GenerateDocumentOptions {
  /** TypeScript 配置文件路径 */
  tsConfigFilePath?: string;
  /** 解析器选项 */
  parserOptions?: ParserOptions;
}
