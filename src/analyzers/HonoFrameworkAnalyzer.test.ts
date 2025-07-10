import { UpdateUserDto, UserIdDto } from "@tests/fixtures/schema";
import { createParseContext, createProject } from "@tests/utils";
import type { Node, Project } from "ts-morph";
import { SyntaxKind } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import z from "zod/v4";
import { CodeAnalyzer } from "@/analyzers/CodeAnalyzer";
import { SchemaRegistry } from "@/registry/SchemaRegistry";
import type { OperationData, ParseContext } from "@/types/parser";
import { HonoFrameworkAnalyzer } from "./HonoFrameworkAnalyzer";

class CustomTestAnalyzer extends CodeAnalyzer {
  analyze(_node: Node): OperationData {
    return {
      extensions: {
        "x-custom-analyzer": "test-value",
      },
    };
  }
}

describe("HonoFrameworkAnalyzer", () => {
  let project: Project;
  let analyzer: HonoFrameworkAnalyzer;
  let context: ParseContext;

  beforeEach(() => {
    project = createProject({
      tsConfigFilePath: "tsconfig.json",
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
    });
    context = createParseContext({}, project);
    project.addDirectoryAtPath("tests/fixtures");
    analyzer = new HonoFrameworkAnalyzer(context);
  });

  describe("properties", () => {
    it("应该有正确的框架名称", () => {
      expect(analyzer.frameworkName).toBe("Hono");
    });
  });

  describe("canAnalyze", () => {
    it("应该对非ExpressionStatement节点返回false", () => {
      const sourceFile = project.createSourceFile("test.ts", "const x = 1;");
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.VariableStatement);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对没有CallExpression的ExpressionStatement返回false", () => {
      const sourceFile = project.createSourceFile("test.ts", "1 + 1;");
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对没有PropertyAccessExpression的CallExpression返回false", () => {
      const sourceFile = project.createSourceFile("test.ts", "func();");
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对无效HTTP方法返回false", () => {
      const sourceFile = project.createSourceFile("test.ts", "app.invalid();");
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对不是Hono类型的对象返回false", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        const app = {get: () => {}}
        app.get("/", (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new HonoFrameworkAnalyzer(context);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对没有两个参数的CallExpression返回false", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/")`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new HonoFrameworkAnalyzer(context);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对不是字符串类型的路径参数返回false", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        const middleware = (c) => {}
        app.get(middleware, (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new HonoFrameworkAnalyzer(context);

      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该对符合Hono路由调用规范的节点返回true", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/", (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new HonoFrameworkAnalyzer(context);

      expect(analyzer.canAnalyze(node)).toBe(true);
    });
  });

  describe("analyze", () => {
    it("应该能够分析Express路由调用并返回操作数据", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        import { UserIdDto, UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/hono"
        const app = new Hono()
        app.put("/api/users/:id", zodValidator("param", UserIdDto), zodValidator("json", UpdateUserDto), (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      const registry = SchemaRegistry.getInstance();
      registry.register(location, { params: UserIdDto, body: UpdateUserDto });

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
      expect(context.schemas.get("UpdateUserDto")).toEqual(z.toJSONSchema(UpdateUserDto));
    });

    it("应该能够使用自定义 Hono 代码分析器", async () => {
      const context = createParseContext({
        customHonoCodeAnalyzers: [CustomTestAnalyzer],
      });
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/users/:id", (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new HonoFrameworkAnalyzer(context);
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
