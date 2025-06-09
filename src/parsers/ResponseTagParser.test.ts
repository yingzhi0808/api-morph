import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { JSDocTagName } from "@/constants";
import { ResponseTagParser } from "./ResponseTagParser";

describe("ResponseTagParser", () => {
  let parser: ResponseTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new ResponseTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual([JSDocTagName.RESPONSE]);
    });
  });

  describe("parse", () => {
    describe("状态码和描述解析", () => {
      it("应该正确解析状态码和描述", async () => {
        const tag = createJSDocTag(`@response 200 成功响应
        x-custom: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "200": {
              description: "成功响应",
              "x-custom": "test",
            },
          },
        });
      });

      it("应该正确解析 default 状态码", async () => {
        const tag = createJSDocTag(`@response default 默认响应
        x-custom: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            default: {
              description: "默认响应",
              "x-custom": "test",
            },
          },
        });
      });

      it("应该正确解析只有状态码的响应（使用HTTP默认描述）", async () => {
        const tag = createJSDocTag(`@response 200
        x-custom: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "200": {
              description: "OK",
              "x-custom": "test",
            },
          },
        });
      });

      it("应该正确解析各种HTTP状态码的默认描述", async () => {
        const testCases = [
          { statusCode: "201", expectedDescription: "Created" },
          { statusCode: "204", expectedDescription: "No Content" },
          { statusCode: "400", expectedDescription: "Bad Request" },
          { statusCode: "401", expectedDescription: "Unauthorized" },
          { statusCode: "404", expectedDescription: "Not Found" },
          { statusCode: "500", expectedDescription: "Internal Server Error" },
        ];

        for (const { statusCode, expectedDescription } of testCases) {
          const tag = createJSDocTag(`@response ${statusCode}
          x-custom: "test"`);
          const result = await parser.parse(tag);
          expect(result).toEqual({
            responses: {
              [statusCode]: {
                description: expectedDescription,
                "x-custom": "test",
              },
            },
          });
        }
      });

      it("应该正确处理单词描述", async () => {
        const tag = createJSDocTag(`@response 201 创建成功
        x-custom: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "201": {
              description: "创建成功",
              "x-custom": "test",
            },
          },
        });
      });
    });

    describe("YAML 参数解析", () => {
      it("应该正确解析完整的 YAML 参数", async () => {
        const tag = createJSDocTag(`@response 200 成功响应
        description: 详细的响应描述
        headers:
          X-Total-Count:
            description: 总记录数
            schema:
              type: integer
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: array
                  items:
                    type: object`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "200": {
              description: "详细的响应描述",
              headers: {
                "x-total-count": {
                  description: "总记录数",
                  schema: {
                    type: "integer",
                  },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          type: "object",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      it("应该正确解析带扩展字段的 YAML 参数", async () => {
        const tag = createJSDocTag(`@response 200 成功
        x-custom-header: custom-value
        x-response-time: fast
        x-cache-enabled: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "200": {
              description: "成功",
              "x-custom-header": "custom-value",
              "x-response-time": "fast",
              "x-cache-enabled": true,
            },
          },
        });
      });

      it("应该正确解析带 links 的 YAML 参数", async () => {
        const tag = createJSDocTag(`@response 201 创建成功
        links:
          GetCreatedResource:
            operationId: getResource
            parameters:
              id: $response.body#/id`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "201": {
              description: "创建成功",
              links: {
                GetCreatedResource: {
                  operationId: "getResource",
                  parameters: {
                    id: "$response.body#/id",
                  },
                },
              },
            },
          },
        });
      });

      it("应该正确处理 YAML 中覆盖描述的情况", async () => {
        const tag = createJSDocTag(`@response 200 参数描述
        description: YAML中的描述`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "200": {
              description: "YAML中的描述",
            },
          },
        });
      });

      it("应该正确处理复杂的 YAML 结构", async () => {
        const tag = createJSDocTag(`@response 200 成功响应
        headers:
          X-Rate-Limit:
            description: 速率限制
            schema:
              type: integer
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
        links:
          NextPage:
            operationId: getUsers
            parameters:
              page: $response.body#/nextPage
        x-cache-ttl: 300
        x-compression: gzip`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "200": {
              description: "成功响应",
              headers: {
                "x-rate-limit": {
                  description: "速率限制",
                  schema: {
                    type: "integer",
                  },
                },
              },
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
                },
              },
              links: {
                NextPage: {
                  operationId: "getUsers",
                  parameters: {
                    page: "$response.body#/nextPage",
                  },
                },
              },
              "x-cache-ttl": 300,
              "x-compression": "gzip",
            },
          },
        });
      });
    });

    describe("错误处理", () => {
      it("应该在没有参数时抛出错误", async () => {
        const tag = createJSDocTag("@response");
        await expect(async () => await parser.parse(tag)).rejects.toThrow(
          /@response 标签 statusCode 不能为空/,
        );
      });

      it("应该在状态码格式无效时抛出错误", async () => {
        const invalidStatusCodes = [
          "20", // 不是3位数
          "2000", // 超过3位数
          "abc", // 不是数字
          "2xx", // 包含非数字字符
          "200x", // 包含非数字字符
        ];

        for (const statusCode of invalidStatusCodes) {
          const tag = createJSDocTag(`@response ${statusCode}
          x-test: "value"`);
          await expect(async () => await parser.parse(tag)).rejects.toThrow(
            /@response 标签 statusCode 格式不正确/,
          );
        }
      });

      it("应该正确处理非标准但格式正确的状态码", async () => {
        const validButNonStandardCodes = [
          "999", // 非标准但3位数
          "111", // 非标准但3位数
          "222", // 非标准但3位数
        ];

        for (const statusCode of validButNonStandardCodes) {
          const tag = createJSDocTag(`@response ${statusCode}
          x-test: "value"`);
          const result = await parser.parse(tag);
          expect(Object.keys(result?.responses || {})[0]).toBe(statusCode);
          // 非标准状态码应该使用空字符串作为默认描述
          expect(result?.responses?.[statusCode]?.description).toBe("");
        }
      });
    });

    describe("边界情况", () => {
      it("应该正确处理所有有效的3位数状态码", async () => {
        const validStatusCodes = [
          "100",
          "101",
          "102", // 1xx
          "200",
          "201",
          "202",
          "204", // 2xx
          "300",
          "301",
          "302",
          "304", // 3xx
          "400",
          "401",
          "403",
          "404",
          "422", // 4xx
          "500",
          "501",
          "502",
          "503", // 5xx
        ];

        for (const statusCode of validStatusCodes) {
          const tag = createJSDocTag(`@response ${statusCode}
          x-test: "value"`);
          const result = await parser.parse(tag);
          expect(Object.keys(result?.responses || {})[0]).toBe(statusCode);
        }
      });

      it("应该正确处理包含数字的描述", async () => {
        const tag = createJSDocTag(`@response 200 版本2.0的API响应
        x-test: "value"`);
        const result = await parser.parse(tag);
        expect(result?.responses?.["200"]?.description).toBe("版本2.0的API响应");
      });

      it("应该正确处理包含标点符号的描述", async () => {
        const tag = createJSDocTag(`@response 400 请求格式错误，请检查参数！
        x-test: "value"`);
        const result = await parser.parse(tag);
        expect(result?.responses?.["400"]?.description).toBe("请求格式错误，请检查参数！");
      });

      it("应该正确处理带有引号的描述", async () => {
        const tag = createJSDocTag(`@response 200 "成功"响应
        x-test: "value"`);
        const result = await parser.parse(tag);
        expect(result?.responses?.["200"]?.description).toBe("成功");
      });

      it("应该正确处理不带描述只有YAML的情况", async () => {
        const tag = createJSDocTag(`@response 201
        headers:
          Location:
            description: 新创建资源的位置
            schema:
              type: string`);
        const result = await parser.parse(tag);
        expect(Object.keys(result?.responses || {})[0]).toBe("201");
        expect(result?.responses?.["201"]?.description).toBe("Created");
        expect(result?.responses?.["201"]?.headers).toEqual({
          location: {
            description: "新创建资源的位置",
            schema: {
              type: "string",
            },
          },
        });
      });

      it("应该正确处理YAML中所有支持的字段", async () => {
        const tag = createJSDocTag(`@response 200 完整响应
        description: YAML描述覆盖参数描述
        headers:
          X-Custom:
            description: 自定义头
        content:
          application/json:
            schema:
              type: object
        links:
          self:
            operationId: getSelf
        x-custom: "扩展字段"`);
        const result = await parser.parse(tag);
        const response = result?.responses?.["200"];

        expect(response?.description).toBe("YAML描述覆盖参数描述");
        expect(response).toHaveProperty("headers");
        expect(response).toHaveProperty("content");
        expect(response).toHaveProperty("links");
        expect(response).toHaveProperty("x-custom", "扩展字段");
      });

      it("应该正确处理只有扩展字段的YAML", async () => {
        const tag = createJSDocTag(`@response 204
        x-processing-time: 100ms
        x-server-id: server-01`);
        const result = await parser.parse(tag);
        const response = result?.responses?.["204"];

        expect(response?.description).toBe("No Content");
        expect(response).toHaveProperty("x-processing-time", "100ms");
        expect(response).toHaveProperty("x-server-id", "server-01");
      });

      it("应该正确处理不同数据类型的扩展字段", async () => {
        const tag = createJSDocTag(`@response 200 成功
        x-timeout: 30000
        x-enabled: true
        x-version: 1.2
        x-custom: null
        x-tags: ["api", "response"]`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "200": {
              description: "成功",
              "x-timeout": 30000,
              "x-enabled": true,
              "x-version": 1.2,
              "x-custom": null,
              "x-tags": ["api", "response"],
            },
          },
        });
      });

      it("应该正确处理空的变量对象", async () => {
        const tag = createJSDocTag(`@response 200 成功
        headers: {}
        content: {}`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "200": {
              description: "成功",
            },
          },
        });
      });
    });

    describe("真实场景测试", () => {
      it("应该正确解析API成功响应", async () => {
        const tag = createJSDocTag(`@response 200 获取用户列表成功
        headers:
          X-Total-Count:
            description: 总用户数
            schema:
              type: integer
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
                      email:
                        type: string
        x-cache-ttl: 300`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "200": {
              description: "获取用户列表成功",
              headers: {
                "x-total-count": {
                  description: "总用户数",
                  schema: {
                    type: "integer",
                  },
                },
              },
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
                            email: {
                              type: "string",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              "x-cache-ttl": 300,
            },
          },
        });
      });

      it("应该正确解析创建资源响应", async () => {
        const tag = createJSDocTag(`@response 201 用户创建成功
        headers:
          Location:
            description: 新创建用户的URL
            schema:
              type: string
              format: uri
        content:
          application/json:
            schema:
              type: object
              properties:
                id:
                  type: integer
                name:
                  type: string
                createdAt:
                  type: string
                  format: date-time
        links:
          GetUser:
            operationId: getUser
            parameters:
              id: $response.body#/id`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "201": {
              description: "用户创建成功",
              headers: {
                location: {
                  description: "新创建用户的URL",
                  schema: {
                    type: "string",
                    format: "uri",
                  },
                },
              },
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
                      createdAt: {
                        type: "string",
                        format: "date-time",
                      },
                    },
                  },
                },
              },
              links: {
                GetUser: {
                  operationId: "getUser",
                  parameters: {
                    id: "$response.body#/id",
                  },
                },
              },
            },
          },
        });
      });

      it("应该正确解析错误响应", async () => {
        const tag = createJSDocTag(`@response 400 请求参数错误
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
                message:
                  type: string
                details:
                  type: array
                  items:
                    type: object
                    properties:
                      field:
                        type: string
                      code:
                        type: string
        x-error-category: validation`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            "400": {
              description: "请求参数错误",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                      message: {
                        type: "string",
                      },
                      details: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            field: {
                              type: "string",
                            },
                            code: {
                              type: "string",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              "x-error-category": "validation",
            },
          },
        });
      });

      it("应该正确解析默认响应", async () => {
        const tag = createJSDocTag(`@response default 未预期的错误
        content:
          application/json:
            schema:
              type: object
              properties:
                error:
                  type: string
                timestamp:
                  type: string
                  format: date-time
        x-fallback: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responses: {
            default: {
              description: "未预期的错误",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: {
                        type: "string",
                      },
                      timestamp: {
                        type: "string",
                        format: "date-time",
                      },
                    },
                  },
                },
              },
              "x-fallback": true,
            },
          },
        });
      });
    });
  });
});
