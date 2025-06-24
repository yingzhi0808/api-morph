import { nanoid } from "nanoid";
import { Project, type ProjectOptions, SyntaxKind } from "ts-morph";
import type { ParseContext, ParserOptions } from "@/types";

/**
 * 创建一个 ts-morph Project 实例，默认使用内存文件系统。
 * @param options 项目选项。
 * @returns Project 实例。
 */
export function createProject(options: ProjectOptions = {}) {
  return new Project({ useInMemoryFileSystem: true, ...options });
}

/**
 * 创建 ParseContext。
 * @param options 解析选项。
 * @param project 项目实例。
 * @returns ParseContext。
 */
export function createParseContext(
  options: ParserOptions = {},
  project = createProject(),
): ParseContext {
  // 默认选项，与 OpenAPIParser 中的保持一致
  const defaultOptions: ParserOptions = {
    enableASTAnalysis: true,
    defaultResponseMediaType: "application/json",
    defaultRequestMediaType: "application/json",
  };

  return {
    schemas: new Map(),
    project,
    typeChecker: project.getTypeChecker(),
    options: { ...defaultOptions, ...options },
  };
}

/**
 * 创建包含指定内容的 JSDocTag。
 * @param content JSDoc 标签内容。
 * @param project ts-morph Project 实例。
 * @returns JSDocTag 对象。
 */
export function createJSDocTag(content: string, project = createProject()) {
  const sourceFile = project.createSourceFile(
    `${nanoid()}.ts`,
    `
      /**
       * ${content}
       */
      function test() {}
      `,
  );
  const [jsDoc] = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc);
  const tag = jsDoc.getTags()[0];
  return tag;
}
