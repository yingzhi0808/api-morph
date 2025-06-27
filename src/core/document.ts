import { Project } from "ts-morph";
import { OpenAPIBuilder } from "@/builders/OpenAPIBuilder";
import { OpenAPIParser } from "@/parsers/OpenAPIParser";
import type { InfoObject, OpenAPIObject } from "@/types/openapi";
import type { ParserOptions } from "@/types/parser";

/**
 * generateDocument 的选项配置
 *
 * @category Core
 */
export interface GenerateDocumentOptions {
  /** TypeScript 配置文件路径 */
  tsConfigFilePath?: string;
  /** 解析器选项 */
  parserOptions?: ParserOptions;
}

/**
 * 生成 OpenAPI 文档。
 * @param config 文档配置，可以是完整的 `OpenAPIObject` 或 `OpenAPIBuilder` 实例。
 * @param options 创建选项。
 * @returns 完整的 OpenAPI 文档对象。
 *
 * @category Core
 */
export function generateDocument(
  config: Partial<Omit<OpenAPIObject, "info"> & { info: Partial<InfoObject> }> | OpenAPIBuilder,
  options?: GenerateDocumentOptions,
) {
  const project = new Project({
    tsConfigFilePath: options?.tsConfigFilePath ?? "tsconfig.json",
  });
  const parser = new OpenAPIParser(project, options?.parserOptions);
  const openAPIBuilder = config instanceof OpenAPIBuilder ? config : new OpenAPIBuilder(config);
  return parser.parse(openAPIBuilder);
}
