import { Project } from "ts-morph";
import { DocumentBuilder } from "@/builders";
import { OpenAPIParser } from "@/parsers";
import type { GenerateDocumentOptions, InfoObject, OpenAPIObject } from "@/types";

/**
 * 生成 OpenAPI 文档。
 * @param config 文档配置，可以是完整的 OpenAPIObject 或 DocumentBuilder 实例。
 * @param options 创建选项。
 * @returns 完整的 OpenAPI 文档对象。
 */
export function generateDocument(
  config: Partial<Omit<OpenAPIObject, "info"> & { info: Partial<InfoObject> }> | DocumentBuilder,
  options?: GenerateDocumentOptions,
) {
  const project = new Project({
    tsConfigFilePath: options?.tsConfigFilePath ?? "tsconfig.json",
  });
  const parser = new OpenAPIParser(project, options?.parserOptions);
  const documentBuilder = config instanceof DocumentBuilder ? config : new DocumentBuilder(config);
  return parser.parse(documentBuilder);
}
