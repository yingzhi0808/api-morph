import { createJSDocTag, createParseContext } from "@tests/utils";
import { Project, SyntaxKind } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParseContext } from "@/types";
import { SimplifiedResponseTagParser } from "./SimplifiedResponseTagParser";

describe("SimplifiedResponseTagParser", () => {
  let parser: SimplifiedResponseTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new SimplifiedResponseTagParser(context);
  });

  describe("基本属性", () => {
    it("应该支持所有 HTTP 状态码的响应标签", () => {
      // 验证包含我们关心的主要标签
      const expectedTags = [
        "okResponse", // 200
        "createdResponse", // 201
        "noContentResponse", // 204
        "badRequestResponse", // 400
        "unauthorizedResponse", // 401
        "forbiddenResponse", // 403
        "notFoundResponse", // 404
        "conflictResponse", // 409
        "internalServerErrorResponse", // 500
      ];

      expectedTags.forEach((tag) => {
        expect(parser.tags).toContain(tag);
      });

      // 验证总标签数量大于我们预期的主要标签（应该包含更多HTTP状态码）
      expect(parser.tags.length).toBeGreaterThan(expectedTags.length);
    });
  });

  describe("状态码映射", () => {
    const testCases = [
      { tag: "@okResponse", expectedStatusCode: "200", expectedDescription: "OK" },
      { tag: "@createdResponse", expectedStatusCode: "201", expectedDescription: "Created" },
      { tag: "@noContentResponse", expectedStatusCode: "204", expectedDescription: "No Content" },
      { tag: "@badRequestResponse", expectedStatusCode: "400", expectedDescription: "Bad Request" },
      {
        tag: "@unauthorizedResponse",
        expectedStatusCode: "401",
        expectedDescription: "Unauthorized",
      },
      { tag: "@forbiddenResponse", expectedStatusCode: "403", expectedDescription: "Forbidden" },
      { tag: "@notFoundResponse", expectedStatusCode: "404", expectedDescription: "Not Found" },
      { tag: "@conflictResponse", expectedStatusCode: "409", expectedDescription: "Conflict" },
      {
        tag: "@internalServerErrorResponse",
        expectedStatusCode: "500",
        expectedDescription: "Internal Server Error",
      },
    ];

    testCases.forEach(({ tag, expectedStatusCode, expectedDescription }) => {
      it(`应该正确解析 ${tag} 标签`, async () => {
        const jsDocTag = createJSDocTag(tag);
        const result = await parser.parse(jsDocTag);
        expect(result).toEqual({
          response: {
            statusCode: expectedStatusCode,
            response: {
              description: expectedDescription,
            },
          },
        });
      });
    });

    it("应该支持动态生成的额外 HTTP 状态码标签", async () => {
      // 测试一些动态生成的额外标签
      const extraTestCases = [
        { tag: "@acceptedResponse", expectedStatusCode: "202", expectedDescription: "Accepted" },
        {
          tag: "@resetContentResponse",
          expectedStatusCode: "205",
          expectedDescription: "Reset Content",
        },
        {
          tag: "@notImplementedResponse",
          expectedStatusCode: "501",
          expectedDescription: "Not Implemented",
        },
        {
          tag: "@serviceUnavailableResponse",
          expectedStatusCode: "503",
          expectedDescription: "Service Unavailable",
        },
      ];

      for (const { tag, expectedStatusCode, expectedDescription } of extraTestCases) {
        const jsDocTag = createJSDocTag(tag);
        const result = await parser.parse(jsDocTag);
        expect(result).toEqual({
          response: {
            statusCode: expectedStatusCode,
            response: {
              description: expectedDescription,
            },
          },
        });
      }
    });
  });

  describe("简化语法", () => {
    describe("完整语法", () => {
      it("应该正确解析只有 mediaType 和描述的语法", async () => {
        const tag = createJSDocTag("@createdResponse application/json 创建成功");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          response: {
            statusCode: "201",
            response: {
              description: "创建成功",
              content: {
                "application/json": {},
              },
            },
          },
        });
      });
    });

    describe("部分语法", () => {
      it("应该正确解析只有 mediaType 和描述的语法", async () => {
        const tag = createJSDocTag("@createdResponse application/json 创建成功");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          response: {
            statusCode: "201",
            response: {
              description: "创建成功",
              content: {
                "application/json": {},
              },
            },
          },
        });
      });
    });

    describe("原始语法", () => {
      it("应该正确解析只有描述的原始语法", async () => {
        const tag = createJSDocTag("@notFoundResponse 资源不存在");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          response: {
            statusCode: "404",
            response: {
              description: "资源不存在",
            },
          },
        });
      });

      it("应该正确解析空描述（使用默认描述）", async () => {
        const tag = createJSDocTag("@unauthorizedResponse");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          response: {
            statusCode: "401",
            response: {
              description: "Unauthorized",
            },
          },
        });
      });

      it("应该正确解析带YAML的原始语法", async () => {
        const tag = createJSDocTag(`@internalServerErrorResponse 服务器错误
        headers:
          X-Error-Code:
            description: 错误代码
            schema:
              type: string`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          response: {
            statusCode: "500",
            response: {
              description: "服务器错误",
              headers: {
                "x-error-code": {
                  description: "错误代码",
                  schema: {
                    type: "string",
                  },
                },
              },
            },
          },
        });
      });
    });
  });

  describe("边界情况", () => {
    it("应该正确处理复杂的 media type", async () => {
      const tag = createJSDocTag("@okResponse application/vnd.api+json API响应");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "200",
          response: {
            description: "API响应",
            content: {
              "application/vnd.api+json": {},
            },
          },
        },
      });
    });

    it("应该正确处理多词描述", async () => {
      const tag = createJSDocTag("@conflictResponse application/json 资源冲突，请检查数据后重试");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "409",
          response: {
            description: "资源冲突，请检查数据后重试",
            content: {
              "application/json": {},
            },
          },
        },
      });
    });
  });

  describe("JSDoc 链接处理", () => {
    const project = new Project({
      tsConfigFilePath: "tsconfig.json",
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
    });
    let parser: SimplifiedResponseTagParser;
    let context: ParseContext;

    beforeEach(() => {
      context = createParseContext(project);
      parser = new SimplifiedResponseTagParser(context);
    });

    project.addDirectoryAtPath("tests/fixtures");

    it("应该正确解析 @okResponse 的完整简化语法", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @okResponse application/json {@link UserVo} 用户登录成功
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "200",
          response: {
            description: "用户登录成功",
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
    });

    it("应该正确解析 @createdResponse 的完整简化语法", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @createdResponse application/json {@link UserVo} 用户创建成功
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "201",
          response: {
            description: "用户创建成功",
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
    });

    it("应该正确解析 @badRequestResponse 的完整简化语法", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { ErrorVo } from "@tests/fixtures/schema";
        /**
         * @badRequestResponse application/json {@link ErrorVo} 请求参数错误
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "400",
          response: {
            description: "请求参数错误",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorVo",
                },
              },
            },
          },
        },
      });
    });

    it("应该正确解析只有 mediaType 和 schema 的语法", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @okResponse application/json {@link UserVo}
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "200",
          response: {
            description: "OK",
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
    });

    it("应该正确解析只有 schema 和描述的语法（使用默认媒体类型）", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @okResponse {@link UserVo} 用户信息
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "200",
          response: {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserVo",
                },
              },
            },
            description: "用户信息",
          },
        },
      });
    });

    it("应该正确处理复杂的 media type 与 JSDoc 链接", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @okResponse application/vnd.api+json {@link UserVo} API响应
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "200",
          response: {
            description: "API响应",
            content: {
              "application/vnd.api+json": {
                schema: {
                  $ref: "#/components/schemas/UserVo",
                },
              },
            },
          },
        },
      });
    });

    it("应该正确处理多词描述与 JSDoc 链接", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { ErrorVo } from "@tests/fixtures/schema";
        /**
         * @conflictResponse application/json {@link ErrorVo} 资源冲突，请检查数据后重试
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "409",
          response: {
            description: "资源冲突，请检查数据后重试",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorVo",
                },
              },
            },
          },
        },
      });
    });

    it("应该支持 media type 简写功能", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @okResponse json {@link UserVo} 用户信息
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "200",
          response: {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserVo",
                },
              },
            },
            description: "用户信息",
          },
        },
      });
    });

    it("应该在省略 mediaType 时使用默认响应媒体类型", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @okResponse {@link UserVo} 用户信息
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "200",
          response: {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserVo",
                },
              },
            },
            description: "用户信息",
          },
        },
      });
    });

    it("应该在省略 mediaType 时使用默认响应媒体类型（只有 schema）", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @createdResponse {@link UserVo}
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        response: {
          statusCode: "201",
          response: {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserVo",
                },
              },
            },
            description: "Created",
          },
        },
      });
    });
  });
});
