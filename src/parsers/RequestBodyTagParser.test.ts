import { createJSDocTag, createParseContext, createProject } from "@tests/utils";
import { type Project, SyntaxKind } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParseContext } from "@/types";
import { RequestBodyTagParser } from "./RequestBodyTagParser";

describe("RequestBodyTagParser", () => {
  let parser: RequestBodyTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new RequestBodyTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["requestBody"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析空的请求体标签", async () => {
      const tag = createJSDocTag("@requestBody");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          content: {
            "application/json": {},
          },
        },
      });
    });

    it("应该正确解析只有描述的请求体标签", async () => {
      const tag = createJSDocTag("@requestBody 用户信息");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户信息",
          content: {
            "application/json": {},
          },
        },
      });
    });

    it("应该正确解析只有 required 的请求体标签", async () => {
      const tag = createJSDocTag("@requestBody required");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          required: true,
          content: {
            "application/json": {},
          },
        },
      });
    });

    it("应该正确解析只有媒体类型的请求体标签", async () => {
      const tag = createJSDocTag("@requestBody application/json");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          content: {
            "application/json": {},
          },
        },
      });
    });

    it("应该正确解析只有 schema 的请求体标签", async () => {
      const tag = createJSDocTag(`@requestBody {$ref: "#/components/schemas/User"}`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/User",
              },
            },
          },
        },
      });
    });

    it("应该正确解析同时指定媒体类型和 schema 的请求体标签", async () => {
      const tag = createJSDocTag(
        `@requestBody application/xml {$ref: "#/components/schemas/User"}`,
      );
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          content: {
            "application/xml": {
              schema: {
                $ref: "#/components/schemas/User",
              },
            },
          },
        },
      });
    });

    it("应该正确处理没有 schema 但有其他参数的情况", async () => {
      const tag = createJSDocTag("@requestBody application/xml required 用户信息");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户信息",
          required: true,
          content: {
            "application/xml": {},
          },
        },
      });
    });

    it("应该正确处理没有媒体类型但有其他参数的情况", async () => {
      const tag = createJSDocTag(
        `@requestBody {$ref: "#/components/schemas/User"} required 用户信息`,
      );
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户信息",
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/User",
              },
            },
          },
        },
      });
    });

    it("应该正确解析完整参数的请求体标签", async () => {
      const tag = createJSDocTag(
        `@requestBody application/xml {$ref: "#/components/schemas/User"} required 用户信息`,
      );
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户信息",
          required: true,
          content: {
            "application/xml": {
              schema: {
                $ref: "#/components/schemas/User",
              },
            },
          },
        },
      });
    });

    it("应该正确处理参数顺序不同的情况", async () => {
      const tag = createJSDocTag(
        `@requestBody required {$ref: "#/components/schemas/User"} application/xml 用户信息`,
      );
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户信息",
          required: true,
          content: {
            "application/xml": {
              schema: {
                $ref: "#/components/schemas/User",
              },
            },
          },
        },
      });
    });

    it("应该正确处理没有内联参数但有 YAML 的情况", async () => {
      const tag = createJSDocTag(`@requestBody
        description: 仅来自YAML的描述
        required: false
        content:
          application/json:
            schema:
              type: string`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "仅来自YAML的描述",
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "string",
              },
            },
          },
        },
      });
    });

    it("应该正确解析带扩展字段的请求体标签", async () => {
      const tag = createJSDocTag(`@requestBody 用户信息
        x-custom-field: custom-value
        x-validation: strict`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户信息",
          content: {
            "application/json": {},
          },
          "x-custom-field": "custom-value",
          "x-validation": "strict",
        },
      });
    });

    it("应该在扩展字段不以 x- 开头时抛出验证错误", async () => {
      const tag = createJSDocTag(`@requestBody 用户信息
        custom-field: "should fail"`);
      await expect(parser.parse(tag)).rejects.toThrow(/Unrecognized key/);
    });

    it("应该正确处理复杂的媒体类型", async () => {
      const validMediaTypes = [
        "application/json",
        "application/xml",
        "text/plain",
        "multipart/form-data",
        "application/x-www-form-urlencoded",
      ];

      for (const mediaType of validMediaTypes) {
        const tag = createJSDocTag(`@requestBody ${mediaType} 测试描述`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          requestBody: {
            description: "测试描述",
            content: {
              [mediaType]: {},
            },
          },
        });
      }
    });

    it("应该正确处理 YAML 中的复杂 content 结构", async () => {
      const tag = createJSDocTag(`@requestBody 多媒体类型请求体
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
            examples:
              user:
                value:
                  name: "张三"
          application/xml:
            schema:
              type: string
            example: "<user><name>张三</name></user>"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "多媒体类型请求体",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                  },
                },
              },
              examples: {
                user: {
                  value: {
                    name: "张三",
                  },
                },
              },
            },
            "application/xml": {
              schema: {
                type: "string",
              },
              example: "<user><name>张三</name></user>",
            },
          },
        },
      });
    });

    it("应该在验证失败时显示正确的错误消息格式", async () => {
      const tag = createJSDocTag(`@requestBody 用户信息
        content: "invalid content format"`);
      await expect(parser.parse(tag)).rejects.toThrow(/正确格式:/);
      await expect(parser.parse(tag)).rejects.toThrow(/@requestBody/);
    });

    it("应该正确处理 YAML 中覆盖 description 字段", async () => {
      const tag = createJSDocTag(`@requestBody 用户信息
        description: 覆盖描述`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "覆盖描述",
          content: {
            "application/json": {},
          },
        },
      });
    });

    it("应该正确处理 YAML 中覆盖 required 字段", async () => {
      const tag = createJSDocTag(`@requestBody 用户信息 required
        required: false`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户信息",
          required: false,
          content: {
            "application/json": {},
          },
        },
      });
    });

    it("应该正确处理 YAML 中覆盖 content 字段", async () => {
      const tag = createJSDocTag(`@requestBody application/xml 用户信息
        content:
          text/plain:
            schema:
              type: string`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户信息",
          content: {
            "text/plain": {
              schema: {
                type: "string",
              },
            },
          },
        },
      });
    });

    describe("应该处理包含 Zod Schema 的情况", () => {
      let project: Project;
      let parser: RequestBodyTagParser;
      let context: ParseContext;

      beforeEach(() => {
        project = createProject({
          tsConfigFilePath: "tsconfig.json",
          useInMemoryFileSystem: false,
          skipAddingFilesFromTsConfig: true,
        });
        project.addDirectoryAtPath("tests/fixtures");
        context = createParseContext({}, project);
        parser = new RequestBodyTagParser(context);
      });

      it("应该正确处理内联参数中的 Zod Schema", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
          `
import { UpdateUserDto } from "@tests/fixtures/schema";
/**
 * @requestBody {@link UpdateUserDto} required 更新的用户信息
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.parse(tag);

        expect(result).toEqual({
          requestBody: {
            description: "更新的用户信息",
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpdateUserDto",
                },
              },
            },
          },
        });
        expect(context.schemas.has("UpdateUserDto")).toBe(true);
      });

      it("应该正确处理 YAML 参数中的 Zod Schema", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
          `
import { UserVo, UpdateUserVo } from "@tests/fixtures/schema";
/**
 * @requestBody 用户信息更新
 * required: true
 * content:
 *   application/json:
 *     schema: {@link UserVo}
 *   application/xml:
 *     schema: {@link UpdateUserVo}
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.parse(tag);

        expect(result).toEqual({
          requestBody: {
            description: "用户信息更新",
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserVo",
                },
              },
              "application/xml": {
                schema: {
                  $ref: "#/components/schemas/UpdateUserVo",
                },
              },
            },
          },
        });
        expect(context.schemas.has("UserVo")).toBe(true);
        expect(context.schemas.has("UpdateUserVo")).toBe(true);
      });
    });
  });
});
