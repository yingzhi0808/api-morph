import { createJSDocTag, createParseContext, createProject } from "@tests/utils";
import { type Project, SyntaxKind } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParseContext } from "@/types";
import { ParameterTagParser } from "./ParameterTagParser";

describe("ParameterTagParser", () => {
  let parser: ParameterTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new ParameterTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["parameter"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析基本的参数标签", async () => {
      const tag = createJSDocTag("@parameter userId query");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "query",
          },
        ],
      });
    });

    it("应该在参数名为空时抛出验证错误", async () => {
      const tag = createJSDocTag("@parameter");
      await expect(parser.parse(tag)).rejects.toThrow(/name 不能为空/);
    });

    it("应该在参数名格式不正确时抛出验证错误", async () => {
      const invalidNames = ["123invalid", "-invalid", "invalid space", "invalid@symbol"];

      for (const name of invalidNames) {
        const tag = createJSDocTag(`@parameter "${name}" path 测试参数`);
        await expect(parser.parse(tag)).rejects.toThrow(/name 格式不正确/);
      }
    });

    it("应该在参数位置为空时抛出验证错误", async () => {
      const tag = createJSDocTag("@parameter userId");
      await expect(parser.parse(tag)).rejects.toThrow(/in 不能为空/);
    });

    it("应该在参数位置不正确时抛出验证错误", async () => {
      const invalidIns = ["body", "form", "invalid"];

      for (const paramIn of invalidIns) {
        const tag = createJSDocTag(`@parameter userId ${paramIn} 测试参数`);
        await expect(parser.parse(tag)).rejects.toThrow(/in 值不正确/);
      }
    });

    it("应该正确解析带描述的参数标签", async () => {
      const tag = createJSDocTag("@parameter userId query 用户ID");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "query",
            description: "用户ID",
          },
        ],
      });
    });

    it("应该正确解析带 required 的参数标签", async () => {
      const tag = createJSDocTag("@parameter userId query required");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "query",
            required: true,
          },
        ],
      });
    });

    it("应该正确解析带 schema 的参数标签", async () => {
      const tag = createJSDocTag(`@parameter userId query {$ref: "#/components/schemas/UserId"}`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "query",
            schema: {
              $ref: "#/components/schemas/UserId",
            },
          },
        ],
      });
    });

    it("应该正确解析同时指定 required、schema 和 description 的参数标签", async () => {
      const tag = createJSDocTag(
        `@parameter userId query required {$ref: "#/components/schemas/UserId"} 用户ID`,
      );
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "query",
            required: true,
            description: "用户ID",
            schema: {
              $ref: "#/components/schemas/UserId",
            },
          },
        ],
      });
    });

    it("应该正确处理参数顺序不同的情况", async () => {
      const tag = createJSDocTag(
        `@parameter userId query {$ref: "#/components/schemas/UserId"} 用户ID required`,
      );
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "query",
            required: true,
            description: "用户ID",
            schema: {
              $ref: "#/components/schemas/UserId",
            },
          },
        ],
      });
    });

    it("应该正确处理各种参数位置", async () => {
      const parameterIns = ["query", "header", "path", "cookie"];

      for (const paramIn of parameterIns) {
        const tag = createJSDocTag(`@parameter testParam ${paramIn} 测试参数`);
        const result = await parser.parse(tag);
        const expected: Record<string, unknown> = {
          name: "testParam",
          in: paramIn,
          description: "测试参数",
        };

        // path 参数自动设置 required: true
        if (paramIn === "path") {
          expected.required = true;
        }

        expect(result).toEqual({
          parameters: [expected],
        });
      }
    });

    it("应该正确处理没有内联参数但有 YAML 的情况", async () => {
      const tag = createJSDocTag(`@parameter
        name: userId
        in: path
        description: 仅来自YAML的描述
        required: true
        schema:
          type: string
          format: uuid`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "path",
            description: "仅来自YAML的描述",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
      });
    });

    it("应该正确处理带 deprecated 的参数标签", async () => {
      const tag = createJSDocTag(`@parameter userId path 用户ID
        deprecated: true`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "path",
            description: "用户ID",
            required: true,
            deprecated: true,
          },
        ],
      });
    });

    it("应该正确处理带 allowEmptyValue 的参数标签", async () => {
      const tag = createJSDocTag(`@parameter filter query 过滤条件
        allowEmptyValue: true`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "filter",
            in: "query",
            description: "过滤条件",
            allowEmptyValue: true,
          },
        ],
      });
    });

    it("应该正确处理带 style 的参数标签", async () => {
      const validStyles = [
        "matrix",
        "label",
        "simple",
        "form",
        "spaceDelimited",
        "pipeDelimited",
        "deepObject",
      ];

      for (const style of validStyles) {
        const tag = createJSDocTag(`@parameter testParam query 测试参数
          style: ${style}`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          parameters: [
            {
              name: "testParam",
              in: "query",
              description: "测试参数",
              style,
            },
          ],
        });
      }
    });

    it("应该正确处理无效的 style 值", async () => {
      const tag = createJSDocTag(`@parameter filter query 过滤条件
        style: invalidStyle`);
      await expect(parser.parse(tag)).rejects.toThrow(/Invalid option/);
    });

    it("应该正确处理带 explode 的参数标签", async () => {
      const tag = createJSDocTag(`@parameter tags query 标签列表
        explode: true`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "tags",
            in: "query",
            description: "标签列表",
            explode: true,
          },
        ],
      });
    });

    it("应该正确处理带 allowReserved 的参数标签", async () => {
      const tag = createJSDocTag(`@parameter url query URL地址
        allowReserved: true`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "url",
            in: "query",
            description: "URL地址",
            allowReserved: true,
          },
        ],
      });
    });

    it("应该正确处理带 content 的参数标签", async () => {
      const tag = createJSDocTag(`@parameter metadata header 元数据
        content:
          application/json:
            schema:
              type: object
              properties:
                version:
                  type: string
          application/xml:
            schema:
              type: string`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "metadata",
            in: "header",
            description: "元数据",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    version: {
                      type: "string",
                    },
                  },
                },
              },
              "application/xml": {
                schema: {
                  type: "string",
                },
              },
            },
          },
        ],
      });
    });

    it("应该正确处理带 example 的参数标签", async () => {
      const tag = createJSDocTag(`@parameter userId query 用户ID
        example: "user123"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "query",
            description: "用户ID",
            example: "user123",
          },
        ],
      });
    });

    it("应该正确处理带 examples 的参数标签", async () => {
      const tag = createJSDocTag(`@parameter status query 状态
        examples:
          active:
            summary: "活跃状态"
            value: "active"
          inactive:
            summary: "非活跃状态"
            value: "inactive"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "status",
            in: "query",
            description: "状态",
            examples: {
              active: {
                summary: "活跃状态",
                value: "active",
              },
              inactive: {
                summary: "非活跃状态",
                value: "inactive",
              },
            },
          },
        ],
      });
    });

    it("应该正确处理带引用 examples 的参数标签", async () => {
      const tag = createJSDocTag(`@parameter userId query 用户ID
        examples:
          validUser:
            $ref: "#/components/examples/ValidUser"
          invalidUser:
            summary: "无效用户"
            value: "invalid"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "query",
            description: "用户ID",
            examples: {
              validUser: {
                $ref: "#/components/examples/ValidUser",
              },
              invalidUser: {
                summary: "无效用户",
                value: "invalid",
              },
            },
          },
        ],
      });
    });

    it("应该正确解析带扩展字段的参数标签", async () => {
      const tag = createJSDocTag(`@parameter userId path 用户ID
        x-custom-field: custom-value
        x-validation: strict`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId",
            in: "path",
            description: "用户ID",
            required: true,
            "x-custom-field": "custom-value",
            "x-validation": "strict",
          },
        ],
      });
    });

    it("应该在扩展字段不以 x- 开头时抛出验证错误", async () => {
      const tag = createJSDocTag(`@parameter userId path 用户ID
        custom-field: "should fail"`);
      await expect(parser.parse(tag)).rejects.toThrow(/Unrecognized key/);
    });

    it("应该正确处理 YAML 中覆盖内联参数的情况", async () => {
      const tag = createJSDocTag(`@parameter userId path required 原始描述
        name: userId2
        in: query
        description: 覆盖描述
        required: false`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameters: [
          {
            name: "userId2",
            in: "query",
            description: "覆盖描述",
            required: false,
          },
        ],
      });
    });

    describe("应该处理包含 Zod Schema 的情况", () => {
      let project: Project;
      let parser: ParameterTagParser;
      let context: ParseContext;

      beforeEach(() => {
        project = createProject({
          tsConfigFilePath: "tsconfig.json",
          useInMemoryFileSystem: false,
          skipAddingFilesFromTsConfig: true,
        });
        project.addDirectoryAtPath("tests/fixtures");
        context = createParseContext({}, project);
        parser = new ParameterTagParser(context);
      });

      it("应该正确处理内联参数中的 Zod Schema", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
          `
import { UserIdDto } from "@tests/fixtures/schema";
/**
 * @parameter userId path {@link UserIdDto} 用户ID
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.parse(tag);

        expect(result).toEqual({
          parameters: [
            {
              name: "userId",
              in: "path",
              description: "用户ID",
              required: true,
              schema: {
                $ref: "#/components/schemas/UserIdDto",
              },
            },
          ],
        });
        expect(context.schemas.has("UserIdDto")).toBe(true);
      });

      it("应该正确处理 YAML 参数中的 Zod Schema", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
          `
import { UserVo, UpdateUserVo } from "@tests/fixtures/schema";
/**
 * @parameter userId path 用户ID
 * required: true
 * schema: {@link UserVo}
 * content:
 *   application/json:
 *     schema: {@link UpdateUserVo}
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.parse(tag);

        expect(result).toEqual({
          parameters: [
            {
              name: "userId",
              in: "path",
              description: "用户ID",
              required: true,
              schema: {
                $ref: "#/components/schemas/UserVo",
              },
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/UpdateUserVo",
                  },
                },
              },
            },
          ],
        });
        expect(context.schemas.has("UserVo")).toBe(true);
        expect(context.schemas.has("UpdateUserVo")).toBe(true);
      });
    });
  });
});
