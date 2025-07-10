import { SpecialAttributesVo, UpdateUserDto, UserIdDto } from "@tests/fixtures/schema";
import { createParseContext, createProject } from "@tests/utils";
import type { Project } from "ts-morph";
import { SyntaxKind } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod/v4";
import { SchemaRegistry } from "@/registry/SchemaRegistry";
import type { ParseContext } from "@/types/parser";
import { HonoZodValidatorCodeAnalyzer } from "./HonoZodValidatorCodeAnalyzer";

describe("HonoZodValidatorCodeAnalyzer", () => {
  let project: Project;
  let analyzer: HonoZodValidatorCodeAnalyzer;
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
    analyzer = new HonoZodValidatorCodeAnalyzer(context);
    registry.clear();
  });

  describe("analyze", () => {
    it("应该处理json body参数的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/hono"
        app.put("/api/users/:id", zodValidator("json", UpdateUserDto), (c) => {})`,
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

    it("应该处理form body参数的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/hono"
        app.put("/api/users/:id", zodValidator("form", UpdateUserDto), (c) => {})`,
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
        import { zodValidator } from "api-morph/hono"
        app.get("/users", zodValidator("query", UserIdDto), (c) => {})
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

    it("应该处理param参数的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { UserIdDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/hono"
        app.get("/users/:id", zodValidator("param", UserIdDto), (c) => {})
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

    it("应该处理header参数的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { UserIdDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/hono"
        app.get("/users", zodValidator("header", UserIdDto), (c) => {})
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
      const sourceFile = project.createSourceFile(filePath, 'app.get("/users", (c) => {});');
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });

    it("应该处理内联的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { zodValidator } from "api-morph/hono"
        import { z } from "zod"
        app.put("/api/users/:id", zodValidator("json", z.object({ name: z.string() })), (c) => {})
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
      const customAnalyzer = new HonoZodValidatorCodeAnalyzer(customContext);
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/hono"
        app.put("/api/users/:id", zodValidator("json", UpdateUserDto), (c) => {})`,
      );
      const node = sourceFile.getStatements()[2];
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      registry.register(location, { body: UpdateUserDto });

      const result = await customAnalyzer.analyze(node);

      expect(result).toEqual({
        requestBody: {
          content: {
            "application/xml": {
              schema: {
                $ref: "#/components/schemas/UpdateUserDto",
              },
            },
          },
        },
      });
    });

    it("应该处理包含特殊属性的Zod schema", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { SpecialAttributesVo } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/hono"
        app.get("/users", zodValidator("query", SpecialAttributesVo), (c) => {})
        `,
      );
      const node = sourceFile.getStatements()[2];
      const location = `${sourceFile.getFilePath()}:${node.getStartLineNumber()}`;
      registry.register(location, { query: SpecialAttributesVo });

      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        parameters: [
          {
            name: "deprecatedField",
            in: "query",
            required: true,
            deprecated: true,
            allowEmptyValue: true,
            description: "已废弃的字段",
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
        ],
      });
    });

    it("应该处理无效的zodValidator调用参数", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { zodValidator } from "api-morph/hono"
        app.get("/users", zodValidator(), (c) => {})
        `,
      );
      const node = sourceFile.getStatements()[1];
      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });

    it("应该处理不是字符串字面量的target参数", async () => {
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { UserIdDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/hono"
        const target = "query";
        app.get("/users", zodValidator(target, UserIdDto), (c) => {})
        `,
      );
      const node = sourceFile.getStatements()[3];
      const result = await analyzer.analyze(node);

      expect(result).toEqual({});
    });

    it("应该处理同时验证json和param的情况", async () => {
      // 测试能够处理多个zodValidator调用并合并结果
      const sourceFile = project.createSourceFile(
        filePath,
        `
        import { UserIdDto, UpdateUserDto } from "@tests/fixtures/schema"
        import { zodValidator } from "api-morph/hono"
        app.put("/api/users/:id",
          zodValidator("param", UserIdDto),
          zodValidator("json", UpdateUserDto),
          (c) => {}
        )
        `,
      );

      const node = sourceFile.getStatements()[2];

      // 需要为每个zodValidator调用单独注册schema
      // 获取路由调用表达式
      const callExpression = node.getFirstChildByKindOrThrow(SyntaxKind.CallExpression);
      const args = callExpression.getArguments();

      // 第一个zodValidator调用 (param)
      const paramValidator = args[1]; // zodValidator("param", UserIdDto)
      const paramLocation = `${sourceFile.getFilePath()}:${paramValidator.getStartLineNumber()}`;
      registry.register(paramLocation, { params: UserIdDto });

      // 第二个zodValidator调用 (json)
      const jsonValidator = args[2]; // zodValidator("json", UpdateUserDto)
      const jsonLocation = `${sourceFile.getFilePath()}:${jsonValidator.getStartLineNumber()}`;
      registry.register(jsonLocation, { body: UpdateUserDto });

      const result = await analyzer.analyze(node);

      // 现在应该包含两个验证的结果
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
  });
});
