import {
  createFileWithContent,
  createJSDocTag,
  createParseContext,
  createProject,
} from "@tests/utils";
import { SyntaxKind } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParseContext } from "@/types";
import { ResponseTagParser } from "./ResponseTagParser";

describe("ResponseTagParser", () => {
  let parser: ResponseTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new ResponseTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["response"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析只有状态码的响应标签", async () => {
      const tag = createJSDocTag("@response 200");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {},
            },
          },
        },
      });
    });

    it("应该正确解析带描述的响应标签", async () => {
      const tag = createJSDocTag("@response 200 成功响应");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "成功响应",
            content: {
              "application/json": {},
            },
          },
        },
      });
    });

    it("应该正确解析带媒体类型的响应标签", async () => {
      const tag = createJSDocTag("@response 200 application/xml 成功响应");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "成功响应",
            content: {
              "application/xml": {},
            },
          },
        },
      });
    });

    it("应该正确解析带 schema 的响应标签", async () => {
      const tag = createJSDocTag(`@response 200 {$ref: "#/components/schemas/User"} 用户信息`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "用户信息",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
        },
      });
    });

    it("应该正确解析同时指定媒体类型和 schema 的响应标签", async () => {
      const tag = createJSDocTag(
        `@response 200 application/xml {$ref: "#/components/schemas/User"} 用户信息`,
      );
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "用户信息",
            content: {
              "application/xml": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
        },
      });
    });

    it("应该正确处理参数顺序不同的情况", async () => {
      const tag = createJSDocTag(
        `@response 200 {$ref: "#/components/schemas/User"} application/xml 用户信息`,
      );
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "用户信息",
            content: {
              "application/xml": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
        },
      });
    });

    it("应该正确处理 default 状态码", async () => {
      const tag = createJSDocTag("@response default 默认错误响应");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          default: {
            description: "默认错误响应",
            content: {
              "application/json": {},
            },
          },
        },
      });
    });

    it("应该正确处理各种 HTTP 状态码", async () => {
      const statusCodes = ["201", "400", "404", "500", "100", "999", "600"];

      for (const statusCode of statusCodes) {
        const tag = createJSDocTag(`@response ${statusCode} 测试响应`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            [statusCode]: {
              description: "测试响应",
              content: {
                "application/json": {},
              },
            },
          },
        });
      }
    });

    it("应该正确处理没有内联参数但有 YAML 的情况", async () => {
      const tag = createJSDocTag(`@response
        statusCode: "200"
        description: 仅来自YAML的描述
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: integer
                name:
                  type: string`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "仅来自YAML的描述",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: {
                      type: "integer",
                    },
                    name: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it("应该正确处理带 headers 的响应标签", async () => {
      const tag = createJSDocTag(`@response 200 成功响应
        headers:
          X-Rate-Limit:
            description: 请求限制
            schema:
              type: integer
          X-Total-Count:
            description: 总数量
            schema:
              type: integer`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "成功响应",
            content: {
              "application/json": {},
            },
            headers: {
              "x-rate-limit": {
                description: "请求限制",
                schema: {
                  type: "integer",
                },
              },
              "x-total-count": {
                description: "总数量",
                schema: {
                  type: "integer",
                },
              },
            },
          },
        },
      });
    });

    it("应该正确处理带 links 的响应标签", async () => {
      const tag = createJSDocTag(`@response 200 成功响应
        links:
          GetUserByUserId:
            operationId: getUserById
            parameters:
              userId: $response.body#/id
          DeleteUser:
            operationRef: "#/paths/~1users~1{userId}/delete"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "成功响应",
            content: {
              "application/json": {},
            },
            links: {
              GetUserByUserId: {
                operationId: "getUserById",
                parameters: {
                  userId: "$response.body#/id",
                },
              },
              DeleteUser: {
                operationRef: "#/paths/~1users~1{userId}/delete",
              },
            },
          },
        },
      });
    });

    it("应该正确解析带扩展字段的响应标签", async () => {
      const tag = createJSDocTag(`@response 200 成功响应
        x-response-time: 100ms
        x-cache-status: hit`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "成功响应",
            content: {
              "application/json": {},
            },
            "x-response-time": "100ms",
            "x-cache-status": "hit",
          },
        },
      });
    });

    it("应该在扩展字段不以 x- 开头时抛出验证错误", async () => {
      const tag = createJSDocTag(`@response 200 成功响应
        custom-field: "should fail"`);
      await expect(parser.parse(tag)).rejects.toThrow(/Unrecognized key/);
    });

    it("应该正确处理复杂的媒体类型", async () => {
      const validMediaTypes = [
        "application/json",
        "application/xml",
        "text/plain",
        "text/html",
        "application/pdf",
      ];

      for (const mediaType of validMediaTypes) {
        const tag = createJSDocTag(`@response 200 ${mediaType} 测试响应`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "200": {
              description: "测试响应",
              content: {
                [mediaType]: {},
              },
            },
          },
        });
      }
    });

    it("应该正确处理 YAML 中的复杂 content 结构", async () => {
      const tag = createJSDocTag(`@response 200 多媒体类型响应
        content:
          application/json:
            schema:
              type: object
              properties:
                users:
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        type: integer
                      name:
                        type: string
            examples:
              users:
                value:
                  users:
                    - id: 1
                      name: "张三"
                    - id: 2
                      name: "李四"
          application/xml:
            schema:
              type: string
            example: "<users><user><id>1</id><name>张三</name></user></users>"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "多媒体类型响应",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    users: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: {
                            type: "integer",
                          },
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
                examples: {
                  users: {
                    value: {
                      users: [
                        {
                          id: 1,
                          name: "张三",
                        },
                        {
                          id: 2,
                          name: "李四",
                        },
                      ],
                    },
                  },
                },
              },
              "application/xml": {
                schema: {
                  type: "string",
                },
                example: "<users><user><id>1</id><name>张三</name></user></users>",
              },
            },
          },
        },
      });
    });

    it("应该正确处理 YAML 中覆盖 description 字段", async () => {
      const tag = createJSDocTag(`@response 200 原始描述
        description: 覆盖描述`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "覆盖描述",
            content: {
              "application/json": {},
            },
          },
        },
      });
    });

    it("应该正确处理 YAML 中覆盖 content 字段", async () => {
      const tag = createJSDocTag(`@response 200 application/xml 测试响应
        content:
          text/plain:
            schema:
              type: string`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "测试响应",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                },
              },
            },
          },
        },
      });
    });

    it("应该在状态码为空时抛出验证错误", async () => {
      const tag = createJSDocTag("@response");
      await expect(parser.parse(tag)).rejects.toThrow(/statusCode 不能为空/);
    });

    it("应该在状态码格式不正确时抛出验证错误", async () => {
      const invalidStatusCodes = ["abc", "12", "1234", "99"];

      for (const statusCode of invalidStatusCodes) {
        const tag = createJSDocTag(`@response ${statusCode} 测试响应`);
        await expect(parser.parse(tag)).rejects.toThrow(/statusCode 格式不正确/);
      }
    });

    it("应该在验证失败时显示正确的错误消息格式", async () => {
      const tag = createJSDocTag(`@response 200 测试响应
        content: "invalid content format"`);
      await expect(parser.parse(tag)).rejects.toThrow(/正确格式:/);
      await expect(parser.parse(tag)).rejects.toThrow(/@response/);
    });

    it("应该使用 HTTP 状态码默认描述当没有提供描述时", async () => {
      const tag = createJSDocTag("@response 404");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "404": {
            description: "Not Found",
            content: {
              "application/json": {},
            },
          },
        },
      });
    });

    it("应该处理没有默认描述的状态码", async () => {
      const tag = createJSDocTag("@response 299");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "299": {
            description: "",
            content: {
              "application/json": {},
            },
          },
        },
      });
    });

    it("应该正确处理没有 schema 但有媒体类型的情况", async () => {
      const tag = createJSDocTag("@response 200 application/xml 成功响应");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "成功响应",
            content: {
              "application/xml": {},
            },
          },
        },
      });
    });

    it("应该正确处理空描述但有其他参数的情况", async () => {
      const tag = createJSDocTag(`@response 200 {$ref: "#/components/schemas/User"}`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
        },
      });
    });

    describe("应该处理包含 Zod Schema 的情况", () => {
      const project = createProject({
        tsConfigFilePath: "tsconfig.json",
        useInMemoryFileSystem: false,
        skipAddingFilesFromTsConfig: true,
      });
      let parser: ResponseTagParser;
      let context: ParseContext;

      project.addDirectoryAtPath("tests/fixtures");

      beforeEach(() => {
        context = createParseContext({}, project);
        parser = new ResponseTagParser(context);
      });

      it("应该正确处理内联参数中的 Zod Schema", async () => {
        const sourceFile = createFileWithContent(
          project,
          `test-${Date.now()}.ts`,
          `
import { UserVo } from "@tests/fixtures/schema";
/**
 * @response 200 {@link UserVo} 用户信息
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.parse(tag);

        expect(result).toEqual({
          responses: {
            "200": {
              description: "用户信息",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/UserVo",
                  },
                },
              },
            },
          },
        });
        expect(context.schemas.has("UserVo")).toBe(true);
      });

      it("应该正确处理 YAML 参数中的 Zod Schema", async () => {
        const sourceFile = createFileWithContent(
          project,
          `test-${Date.now()}.ts`,
          `
import { UserVo, ErrorVo } from "@tests/fixtures/schema";
/**
 * @response 200 成功响应
 * content:
 *   application/json:
 *     schema: {@link UserVo}
 *   application/xml:
 *     schema: {@link ErrorVo}
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.parse(tag);

        expect(result).toEqual({
          responses: {
            "200": {
              description: "成功响应",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/UserVo",
                  },
                },
                "application/xml": {
                  schema: {
                    $ref: "#/components/schemas/ErrorVo",
                  },
                },
              },
            },
          },
        });
        expect(context.schemas.has("UserVo")).toBe(true);
        expect(context.schemas.has("ErrorVo")).toBe(true);
      });
    });
  });
});
