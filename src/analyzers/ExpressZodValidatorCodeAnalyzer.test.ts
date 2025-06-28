import { createParseContext, createProject } from "@tests/utils";
import type { Project } from "ts-morph";
import { SyntaxKind } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParseContext } from "@/types/parser";
import { ExpressZodValidatorCodeAnalyzer } from "./ExpressZodValidatorCodeAnalyzer";

describe("ExpressZodValidatorCodeAnalyzer", () => {
  let project: Project;
  let analyzer: ExpressZodValidatorCodeAnalyzer;
  let context: ParseContext;

  beforeEach(() => {
    project = createProject({
      tsConfigFilePath: "tsconfig.json",
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
    });
    project.addDirectoryAtPath("tests/fixtures");
    context = createParseContext({}, project);
    analyzer = new ExpressZodValidatorCodeAnalyzer(context);
  });

  describe("analyze", () => {
    it("应该处理body参数的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.put("/api/users/:id", zodValidator({ body: UpdateUserDto }), (req, res) => {})`,
      );
      const node = sourceFile.getStatements()[2];
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
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

    it("应该处理query参数的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { UserIdDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.get("/users", zodValidator({ query: UserIdDto }), (req, res) => {})
        `,
      );
      const node = sourceFile.getStatements()[2];
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            description: "用户ID",
            schema: { type: "string" },
          },
        ],
      });
    });

    it("应该处理path参数的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { UserIdDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.get("/users/:id", zodValidator({ params: UserIdDto }), (req, res) => {})
        `,
      );
      const node = sourceFile.getStatements()[2];
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "用户ID",
            schema: { type: "string" },
          },
        ],
      });
    });

    it("应该处理headers参数的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { UserIdDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.get("/users", zodValidator({ headers: UserIdDto }), (req, res) => {})
        `,
      );
      const node = sourceFile.getStatements()[2];
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        parameters: [
          {
            name: "id",
            in: "header",
            required: true,
            description: "用户ID",
            schema: { type: "string" },
          },
        ],
      });
    });

    it("应该处理没有validateRequest调用的路由", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        'app.get("/users", (req, res) => {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });

    it("应该处理validateRequest没有参数的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { zodValidator } from "api-morph/express"
        app.get("/users", zodValidator(), (req, res) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });

    it("应该处理validateRequest参数不是对象字面量的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { zodValidator } from "api-morph/express"
        app.get("/users", zodValidator(someVariable), (req, res) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });

    it("应该处理未知的属性名", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.put("/api/users/:id", zodValidator({ unknown: UpdateUserDto }), (req, res) => {})`,
      );
      const node = sourceFile.getStatements()[2];
      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });

    it("应该处理非Zod类型的标识符", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        const notZodSchema = { type: "object" }
        app.get("/users", zodValidator({ body: notZodSchema }), (req, res) => {})`,
      );
      const node = sourceFile.getStatements()[1];
      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });

    it("应该处理内联Zod schema调用", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { z } from "zod"
        import { zodValidator } from "api-morph/express"
        app.get("/users", zodValidator({ body: z.object({ name: z.string() }) }), (req, res) => {})`,
      );
      const node = sourceFile.getStatements()[2];
      const result = await analyzer.analyze(node);

      // 当前实现暂时跳过内联schema，所以应该返回空对象
      expect(result).toEqual({});
    });

    it("应该处理非标识符和非调用表达式的节点", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { zodValidator } from "api-morph/express"
        app.get("/users", zodValidator({ body: "literal-string" }), (req, res) => {})`,
      );
      const node = sourceFile.getStatements()[1];
      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });

    it("应该使用默认的请求媒体类型", async () => {
      const customContext = createParseContext(
        {
          defaultRequestBodyMediaType: "application/json",
        },
        project,
      );
      const customAnalyzer = new ExpressZodValidatorCodeAnalyzer(customContext);
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.put("/api/users/:id", zodValidator({ body: UpdateUserDto }), (req, res) => {})`,
      );
      const node = sourceFile.getStatements()[2];
      const result = await customAnalyzer.analyze(node);

      expect(result.requestBody?.content).toHaveProperty("application/json");
    });

    it("应该处理包含特殊属性的参数schema", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { SpecialAttributesVo } from "@tests/fixtures/schema"  
        import { zodValidator } from "api-morph/express"
        app.get("/users", zodValidator({ query: SpecialAttributesVo }), (req, res) => {})
        `,
      );
      const node = sourceFile.getStatements()[2];
      const result = await analyzer.analyze(node);

      expect(result.parameters).toEqual([
        {
          name: "deprecatedField",
          in: "query",
          required: true,
          description: "已废弃的字段",
          deprecated: true,
          allowEmptyValue: true,
          example: "old-value",
          examples: {
            example1: { value: "value1", description: "示例1" },
            example2: { value: "value2", description: "示例2" },
          },
          schema: { type: "string" },
        },
        {
          name: "optionalField",
          in: "query",
          required: false,
          description: "可选字段",
          schema: { type: "string" },
        },
      ]);
    });

    it("应该处理包含非对象类型属性的schema", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { NonObjectSchemaVo } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.get("/users", zodValidator({ query: NonObjectSchemaVo }), (req, res) => {})
        `,
      );
      const node = sourceFile.getStatements()[2];
      const result = await analyzer.analyze(node);

      expect(result).toEqual({ parameters: [] });
    });
  });
});
