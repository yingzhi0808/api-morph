import { Project, type ProjectOptions, SyntaxKind } from "ts-morph";
import type { ParseContext, ParserOptions, SourceOperationData } from "@/types";

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
 * 在指定的 Project 中创建包含指定内容的文件。
 * @param project ts-morph Project 实例。
 * @param fileName 文件名。
 * @param content 文件内容。
 * @returns 创建的 SourceFile 实例。
 */
export function createFileWithContent(project: Project, fileName: string, content: string) {
  return project.createSourceFile(fileName, content);
}

/**
 * 创建包含指定内容的 JSDocTag。
 * @param content JSDoc 标签内容。
 * @param project ts-morph Project 实例。
 * @returns JSDocTag 对象。
 */
export function createJSDocTag(
  content: string,
  project = new Project({ useInMemoryFileSystem: true }),
) {
  const sourceFile = project.createSourceFile(
    `test-${Date.now()}.ts`,
    `
      /**
       * ${content}
       */
      function test() {}
      `,
  );
  const [jsDoc] = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc);
  const tag = jsDoc?.getTags()[0];
  if (!tag) {
    throw new Error("无法创建JSDoc标签");
  }
  return tag;
}

/**
 * 创建测试用的 SourceOperationData 对象。
 * @param tagContents JSDoc 标签内容数组。
 * @returns SourceOperationData 对象。
 */
export function createSourceOperationData(tagContents: string[]): SourceOperationData {
  const project = new Project({ useInMemoryFileSystem: true });
  const docComments = tagContents.map((content) => ` * ${content}`).join("\n");
  const sourceFile = project.createSourceFile(
    `test-${Date.now()}.ts`,
    `/**
${docComments}
 */
function test() {}`,
  );

  const [jsDoc] = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc);

  return {
    node: jsDoc.getParent(),
    tags: jsDoc.getTags(),
  };
}
