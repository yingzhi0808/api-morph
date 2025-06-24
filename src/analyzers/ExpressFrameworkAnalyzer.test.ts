import { createParseContext, createProject } from "@tests/utils";
import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import { ASTAnalyzer } from "@/core/ASTAnalyzer";
import type { OperationData, ParseContext } from "@/types";
import { ExpressFrameworkAnalyzer } from "./ExpressFrameworkAnalyzer";

class CustomTestAnalyzer extends ASTAnalyzer {
  analyze(_node: Node): OperationData {
    return {
      extensions: {
        "x-custom-analyzer": "test-value",
      },
    };
  }
}

describe("ExpressFrameworkAnalyzer", () => {
  let analyzer: ExpressFrameworkAnalyzer;
  let context: ParseContext;

  beforeEach(() => {
    context = createParseContext();
    analyzer = new ExpressFrameworkAnalyzer(context);
  });

  describe("properties", () => {
    it("应该有正确的框架名称", () => {
      expect(analyzer.frameworkName).toBe("Express");
    });
  });

  describe("canAnalyze", () => {
    it("应该对非ExpressionStatement节点返回false", () => {
      const sourceFile = context.project.createSourceFile("test.ts", "const x = 1;");
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.VariableStatement);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对没有CallExpression的ExpressionStatement返回false", () => {
      const sourceFile = context.project.createSourceFile("test.ts", "1 + 1;");
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对没有PropertyAccessExpression的CallExpression返回false", () => {
      const sourceFile = context.project.createSourceFile("test.ts", "func();");
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对无效HTTP方法返回false", () => {
      const sourceFile = context.project.createSourceFile("test.ts", "app.invalid();");
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对不是Express类型的对象返回false", () => {
      const project = createProject({
        tsConfigFilePath: "tsconfig.json",
        useInMemoryFileSystem: false,
        skipAddingFilesFromTsConfig: true,
      });
      const context = createParseContext({}, project);
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        const app = { get: () => {} }
        app.get("/", (req, res) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new ExpressFrameworkAnalyzer(context);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对没有两个参数的CallExpression返回false", () => {
      const project = createProject({
        tsConfigFilePath: "tsconfig.json",
        useInMemoryFileSystem: false,
        skipAddingFilesFromTsConfig: true,
      });
      const context = createParseContext({}, project);
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import express from "express"
        const app = express()
        app.get("/")`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new ExpressFrameworkAnalyzer(context);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对不是字符串字面量的路径参数返回false", () => {
      const project = createProject({
        tsConfigFilePath: "tsconfig.json",
        useInMemoryFileSystem: false,
        skipAddingFilesFromTsConfig: true,
      });
      const context = createParseContext({}, project);
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import express from "express"
        const app = express()
        const path = '/'
        app.get(path, (req, res) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new ExpressFrameworkAnalyzer(context);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对符合Express路由调用规范的节点返回true", () => {
      const project = createProject({
        tsConfigFilePath: "tsconfig.json",
        useInMemoryFileSystem: false,
        skipAddingFilesFromTsConfig: true,
      });
      const context = createParseContext({}, project);
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import express from "express"
        const app = express()
        app.get("/", (req, res) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new ExpressFrameworkAnalyzer(context);

      expect(analyzer.canAnalyze(node)).toBe(true);
    });
  });

  describe("analyze", () => {
    it("应该能够分析Express路由调用并返回操作数据", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        const app = { get: () => {} }
        app.get("/users/:id", (req, res) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new ExpressFrameworkAnalyzer(context);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({ method: "get", path: "/users/{id}", operationId: "getUsersById" });
    });

    it("应该能够集成ExpressZodValidationASTAnalyzer来分析Zod验证", async () => {
      const project = createProject({
        tsConfigFilePath: "tsconfig.json",
        useInMemoryFileSystem: false,
        skipAddingFilesFromTsConfig: true,
      });

      project.addDirectoryAtPath("tests/fixtures");

      const context = createParseContext({}, project);
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
import express from "express"
import { UserIdDto, UpdateUserDto } from "@tests/fixtures/schema"
const app = express()
app.put("/api/users/:id", validateRequest({
  params: UserIdDto,
  body: UpdateUserDto
}), (req, res) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new ExpressFrameworkAnalyzer(context);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "put",
        path: "/api/users/{id}",
        operationId: "putApiUsersById",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "用户ID",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateUserDto",
              },
            },
          },
        },
      });
    });

    it("应该能够使用自定义Express AST分析器", async () => {
      const context = createParseContext({
        customExpressASTAnalyzers: [CustomTestAnalyzer],
      });
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        const app = { get: () => {} }
        app.get("/users/:id", (req, res) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new ExpressFrameworkAnalyzer(context);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "get",
        path: "/users/{id}",
        operationId: "getUsersById",
        extensions: {
          "x-custom-analyzer": "test-value",
        },
      });
    });
  });
});
