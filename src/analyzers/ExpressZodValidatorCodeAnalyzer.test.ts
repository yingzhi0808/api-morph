import { SpecialAttributesVo, UpdateUserDto, UserIdDto } from "@tests/fixtures/schema";
import { createParseContext, createProject } from "@tests/utils";
import type { Project } from "ts-morph";
import { SyntaxKind } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import z from "zod/v4";
import { SchemaRegistry } from "@/registry/SchemaRegistry";
import type { ParseContext } from "@/types/parser";
import { ExpressZodValidatorCodeAnalyzer } from "./ExpressZodValidatorCodeAnalyzer";

describe("ExpressZodValidatorCodeAnalyzer", () => {
  let project: Project;
  let analyzer: ExpressZodValidatorCodeAnalyzer;
  let context: ParseContext;
  const registry = SchemaRegistry.getInstance();
  const filePath = "test.ts";

  beforeEach(() => {
    project = createProject({
      tsConfigFilePath: "tsconfig.json",
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
    });
    project.addDirectoryAtPath("tests/fixtures");
    context = createParseContext({}, project);
    analyzer = new ExpressZodValidatorCodeAnalyzer(context);
    registry.clear();
  });

  describe("analyze", () => {
    it("应该处理body参数的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.put("/api/users/:id", zodValidator({ body: UpdateUserDto }), (req, res) => {})`,
      );
      const node = sourceFile.getStatements()[2];
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      registry.register(location, { body: UpdateUserDto });

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
        filePath,
        `
        import { UserIdDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.get("/users", zodValidator({ query: UserIdDto }), (req, res) => {})
        `,
      );
      const node = sourceFile.getStatements()[2];
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      registry.register(location, { query: UserIdDto });

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
        filePath,
        `
        import { UserIdDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.get("/users/:id", zodValidator({ params: UserIdDto }), (req, res) => {})
        `,
      );
      const node = sourceFile.getStatements()[2];
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      registry.register(location, { params: UserIdDto });

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
        filePath,
        `
        import { UserIdDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.get("/users", zodValidator({ headers: UserIdDto }), (req, res) => {})
        `,
      );
      const node = sourceFile.getStatements()[2];
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      registry.register(location, { headers: UserIdDto });

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

    it("应该处理没有zodValidator调用的路由", async () => {
      const sourceFile = project.createSourceFile(filePath, 'app.get("/users", (req, res) => {});');
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });

    it("应该处理内联的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { zodValidator } from "api-morph/express"
        import { z } from "zod"
        app.put("/api/users/:id", zodValidator({ body: z.object({ name: z.string() }) }), (req, res) => {})
        `,
      );
      const node = sourceFile.getStatements()[2];
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      registry.register(location, { body: z.object({ name: z.string() }) });

      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $schema: "https://json-schema.org/draft/2020-12/schema",
                additionalProperties: false,
                properties: {
                  name: {
                    type: "string",
                  },
                },
                required: ["name"],
                type: "object",
              },
            },
          },
        },
      });
      expect(context.schemas.size).toEqual(0);
    });

    it("应该使用默认的请求媒体类型", async () => {
      const customContext = createParseContext(
        {
          defaultRequestBodyMediaType: "application/xml",
        },
        project,
      );
      const customAnalyzer = new ExpressZodValidatorCodeAnalyzer(customContext);
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/express"
        app.put("/api/users/:id", zodValidator({ body: UpdateUserDto }), (req, res) => {})`,
      );
      const node = sourceFile.getStatements()[2];
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      registry.register(location, { body: UpdateUserDto });

      const result = await customAnalyzer.analyze(node);

      expect(result.requestBody?.content).toHaveProperty("application/xml");
    });

    it("应该处理包含特殊属性的参数schema", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
      import { SpecialAttributesVo } from "@tests/fixtures/schema"
      import { zodValidator } from "api-morph/koa"
      router.get("/users", zodValidator({ query: SpecialAttributesVo }), (req, res) => {})
      `,
      );
      const node = sourceFile.getStatements()[2];
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      registry.register(location, { query: SpecialAttributesVo });

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
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      registry.register(location, { query: SpecialAttributesVo });

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

    it("当 schema 未在注册表中注册时应返回空对象", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/koa"
        router.put("/api/users/:id", zodValidator({ body: UpdateUserDto }), (req, res) => {})`,
      );
      const node = sourceFile.getStatements()[2];
      // 注意：这里我们没有调用 registry.register()

      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });
  });
});
