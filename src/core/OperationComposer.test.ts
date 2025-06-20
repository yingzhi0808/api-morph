import { createParseContext, createSourceOperationData } from "@tests/utils";
import type { Node } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import type { HttpMethod } from "@/constants";
import { FrameworkAnalyzer, FrameworkAnalyzerRegistry, TagParser, TagParserRegistry } from "@/core";
import {
  CallbackTagParser,
  DeprecatedTagParser,
  DescriptionTagParser,
  ExtensionsTagParser,
  ExternalDocsTagParser,
  OperationIdTagParser,
  OperationTagParser,
  ParameterTagParser,
  RequestBodyTagParser,
  ResponsesExtensionsTagParser,
  ResponseTagParser,
  SecurityTagParser,
  ServerTagParser,
  SummaryTagParser,
  TagsTagParser,
} from "@/parsers";
import type { ParameterObject, RequestBodyObject, ResponseObject } from "@/types";
import { OperationComposer } from "./OperationComposer";

describe("OperationComposer", () => {
  const context = createParseContext();
  const tagParserRegistry = new TagParserRegistry();
  const frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();
  let parser: OperationComposer;

  tagParserRegistry.register(new ParameterTagParser(context));
  tagParserRegistry.register(new RequestBodyTagParser(context));
  tagParserRegistry.register(new ResponseTagParser(context));
  tagParserRegistry.register(new ExternalDocsTagParser(context));
  tagParserRegistry.register(new SecurityTagParser(context));
  tagParserRegistry.register(new ServerTagParser(context));
  tagParserRegistry.register(new CallbackTagParser(context));
  tagParserRegistry.register(new OperationIdTagParser(context));
  tagParserRegistry.register(new DeprecatedTagParser(context));
  tagParserRegistry.register(new ExtensionsTagParser(context));
  tagParserRegistry.register(new ResponsesExtensionsTagParser(context));
  tagParserRegistry.register(new DescriptionTagParser(context));
  tagParserRegistry.register(new SummaryTagParser(context));
  tagParserRegistry.register(new TagsTagParser(context));
  tagParserRegistry.register(new OperationTagParser(context));

  beforeEach(() => {
    parser = new OperationComposer(tagParserRegistry, frameworkAnalyzerRegistry);
  });

  describe("compose", () => {
    it("应该正确解析单个操作标签", async () => {
      const sourceData = createSourceOperationData(["@operation get /users"]);
      const result = await parser.compose(sourceData);

      expect(result.method).toBe("get");
      expect(result.path).toBe("/users");
      expect(result.operation).toHaveProperty("responses");
    });

    it("应该正确解析多个不同类型的标签", async () => {
      const sourceData = createSourceOperationData([
        "@operation post /users",
        "@summary 创建新用户",
        "@description 创建一个新的用户账户",
        "@tags user authentication",
        "@parameter userId path 用户ID",
        "@response 201 创建成功",
      ]);
      const result = await parser.compose(sourceData);

      expect(result.method).toBe("post");
      expect(result.path).toBe("/users");
      expect(result.operation.summary).toBe("创建新用户");
      expect(result.operation.description).toBe("创建一个新的用户账户");
      expect(result.operation.tags).toEqual(["user", "authentication"]);
      expect(result.operation.parameters).toHaveLength(1);

      const param = result.operation.parameters?.[0] as ParameterObject;
      expect(param).toMatchObject({
        name: "userId",
        in: "path",
        description: "用户ID",
        required: true,
      });
      expect(result.operation.responses).toHaveProperty("201");
      expect(result.operation.responses?.["201"]).toMatchObject({
        description: "创建成功",
      });
    });

    it("应该正确处理请求体标签", async () => {
      const sourceData = createSourceOperationData([
        "@operation post /users",
        `@requestBody 用户信息
         required: true
         content:
           application/json:
             schema:
               type: object
               properties:
                 name:
                   type: string`,
      ]);
      const result = await parser.compose(sourceData);

      const requestBody = result.operation.requestBody as RequestBodyObject;
      expect(requestBody).toMatchObject({
        description: "用户信息",
        required: true,
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
          },
        },
      });
    });

    it("应该正确处理多个参数标签", async () => {
      const sourceData = createSourceOperationData([
        "@operation get /users",
        "@parameter page query 页码",
        "@parameter limit query 每页数量",
        "@parameter sort header 排序字段",
      ]);
      const result = await parser.compose(sourceData);

      expect(result.operation.parameters).toHaveLength(3);

      const params = result.operation.parameters as ParameterObject[];
      expect(params[0]).toMatchObject({
        name: "page",
        in: "query",
        description: "页码",
      });
      expect(params[1]).toMatchObject({
        name: "limit",
        in: "query",
        description: "每页数量",
      });
      expect(params[2]).toMatchObject({
        name: "sort",
        in: "header",
        description: "排序字段",
      });
    });

    it("应该正确处理多个响应标签", async () => {
      const sourceData = createSourceOperationData([
        "@operation get /users",
        "@response 200 成功获取用户列表",
        "@response 404 用户未找到",
        "@response 500 服务器内部错误",
      ]);
      const result = await parser.compose(sourceData);

      expect(result.operation.responses).toHaveProperty("200");
      expect(result.operation.responses).toHaveProperty("404");
      expect(result.operation.responses).toHaveProperty("500");
      expect(result.operation.responses?.["200"]).toMatchObject({
        description: "成功获取用户列表",
      });
      expect(result.operation.responses?.["404"]).toMatchObject({
        description: "用户未找到",
      });
      expect(result.operation.responses?.["500"]).toMatchObject({
        description: "服务器内部错误",
      });
    });

    it("应该正确处理扩展属性标签", async () => {
      const sourceData = createSourceOperationData([
        "@operation get /users",
        `@extensions
x-code-samples: true`,
        `@responsesExtensions
x-nullable: false`,
      ]);
      const result = await parser.compose(sourceData);

      expect(result.operation).toHaveProperty("x-code-samples", true);
      expect(result.operation.responses).toHaveProperty("x-nullable", false);
    });

    it("应该正确处理外部文档标签", async () => {
      const sourceData = createSourceOperationData([
        "@operation get /users",
        "@externalDocs https://example.com/api-docs 详细的API文档",
      ]);
      const result = await parser.compose(sourceData);

      expect(result.operation.externalDocs).toMatchObject({
        url: "https://example.com/api-docs",
        description: "详细的API文档",
      });
    });

    it("应该正确处理操作ID标签", async () => {
      const sourceData = createSourceOperationData([
        "@operation get /users",
        "@operationId getUserList",
      ]);
      const result = await parser.compose(sourceData);

      expect(result.operation.operationId).toBe("getUserList");
    });

    it("应该正确处理废弃标签", async () => {
      const sourceData = createSourceOperationData(["@operation get /users", "@deprecated"]);
      const result = await parser.compose(sourceData);

      expect(result.operation.deprecated).toBe(true);
    });

    it("应该正确处理复杂的YAML参数", async () => {
      const sourceData = createSourceOperationData([
        "@operation post /users",
        `@parameter filter query 过滤条件
         required: true
         schema:
           type: object
           properties:
             name:
               type: string
         x-custom: value`,
        `@response 201 创建成功
         headers:
           location:
             description: 新创建资源的位置
             schema:
               type: string
         content:
           application/json:
             schema:
               type: object`,
      ]);
      const result = await parser.compose(sourceData);

      const param = result.operation.parameters?.[0] as ParameterObject;
      expect(param).toMatchObject({
        name: "filter",
        in: "query",
        description: "过滤条件",
        required: true,
        schema: {
          type: "object",
          properties: {
            name: {
              type: "string",
            },
          },
        },
        "x-custom": "value",
      });

      const response = result.operation.responses?.["201"] as ResponseObject;
      expect(response).toMatchObject({
        description: "创建成功",
        headers: {
          location: {
            description: "新创建资源的位置",
            schema: {
              type: "string",
            },
          },
        },
        content: {
          "application/json": {
            schema: {
              type: "object",
            },
          },
        },
      });
    });

    it("应该正确处理标签解析器返回null的情况", async () => {
      class NullReturnParser extends TagParser {
        tags = ["mock"];
        parse() {
          return null;
        }
      }

      const context = createParseContext();
      const tagParserRegistry = new TagParserRegistry();
      const frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();
      tagParserRegistry.register(new NullReturnParser(context));

      const mockParser = new OperationComposer(tagParserRegistry, frameworkAnalyzerRegistry);

      const sourceData = createSourceOperationData(["@mock test"]);
      const result = await mockParser.compose(sourceData);

      expect(result).toEqual({
        operation: {
          responses: {},
        },
        method: undefined,
        path: undefined,
      });
    });

    it("应该在找不到解析器时抛出错误", async () => {
      const sourceData = createSourceOperationData(["@unknownTag some content"]);

      await expect(async () => await parser.compose(sourceData)).rejects.toThrow(/未找到标签/);
    });

    it("应该正确处理所有支持的操作元数据标签", async () => {
      const sourceData = createSourceOperationData([
        "@operation put /users/{id}",
        "@summary 更新用户信息",
        "@description 根据用户ID更新用户的详细信息",
        "@tags user profile",
        "@operationId updateUser",
        "@externalDocs https://docs.example.com/users 用户API文档",
        "@deprecated",
        `@extensions
x-rate-limit: 100`,
        `@responsesExtensions
x-cache-ttl: 3600`,
      ]);
      const result = await parser.compose(sourceData);

      expect(result.method).toBe("put");
      expect(result.path).toBe("/users/{id}");
      expect(result.operation.summary).toBe("更新用户信息");
      expect(result.operation.description).toBe("根据用户ID更新用户的详细信息");
      expect(result.operation.tags).toEqual(["user", "profile"]);
      expect(result.operation.operationId).toBe("updateUser");
      expect(result.operation.externalDocs).toMatchObject({
        url: "https://docs.example.com/users",
        description: "用户API文档",
      });
      expect(result.operation.deprecated).toBe(true);
      expect(result.operation).toHaveProperty("x-rate-limit", 100);
      expect(result.operation.responses).toHaveProperty("x-cache-ttl", 3600);
    });

    it("应该正确处理所有类型的参数位置", async () => {
      const sourceData = createSourceOperationData([
        "@operation get /users/{id}",
        "@parameter id path 用户ID",
        "@parameter filter query 过滤条件",
        "@parameter authorization header 认证令牌",
        "@parameter sessionId cookie 会话ID",
      ]);
      const result = await parser.compose(sourceData);

      expect(result.operation.parameters).toHaveLength(4);

      const params = result.operation.parameters as ParameterObject[];
      const pathParam = params.find((p) => p.in === "path");
      expect(pathParam).toMatchObject({
        name: "id",
        in: "path",
        description: "用户ID",
        required: true,
      });

      const queryParam = params.find((p) => p.in === "query");
      expect(queryParam).toMatchObject({
        name: "filter",
        in: "query",
        description: "过滤条件",
      });

      const headerParam = params.find((p) => p.in === "header");
      expect(headerParam).toMatchObject({
        name: "authorization",
        in: "header",
        description: "认证令牌",
      });

      const cookieParam = params.find((p) => p.in === "cookie");
      expect(cookieParam).toMatchObject({
        name: "sessionId",
        in: "cookie",
        description: "会话ID",
      });
    });

    it("应该正确处理多种内容类型的请求体", async () => {
      const sourceData = createSourceOperationData([
        "@operation post /upload",
        `@requestBody 文件上传
         required: true
         content:
           application/json:
             schema:
               type: object
           multipart/form-data:
             schema:
               type: object
               properties:
                 file:
                   type: string
                   format: binary`,
      ]);
      const result = await parser.compose(sourceData);

      const requestBody = result.operation.requestBody as RequestBodyObject;
      expect(requestBody.content).toHaveProperty("application/json");
      expect(requestBody.content).toHaveProperty("multipart/form-data");
      expect(requestBody.content?.["multipart/form-data"]?.schema).toMatchObject({
        type: "object",
        properties: {
          file: {
            type: "string",
            format: "binary",
          },
        },
      });
    });

    it("应该正确处理带头部信息的响应", async () => {
      const sourceData = createSourceOperationData([
        "@operation get /users",
        `@response 200 用户列表
         headers:
           x-total-count:
             description: 总数量
             schema:
               type: integer
           x-page-size:
             description: 页面大小
             schema:
               type: integer
         content:
           application/json:
             schema:
               type: array`,
      ]);
      const result = await parser.compose(sourceData);

      const response = result.operation.responses?.["200"] as ResponseObject;
      expect(response.headers).toHaveProperty("x-total-count");
      expect(response.headers).toHaveProperty("x-page-size");
      expect(response.headers?.["x-total-count"]).toMatchObject({
        description: "总数量",
        schema: { type: "integer" },
      });
      expect(response.content).toHaveProperty("application/json");
    });

    it("应该正确处理默认响应状态码", async () => {
      const sourceData = createSourceOperationData([
        "@operation get /users",
        "@response default 默认错误响应",
      ]);
      const result = await parser.compose(sourceData);

      expect(result.operation.responses).toHaveProperty("default");
      expect(result.operation.responses?.default).toMatchObject({
        description: "默认错误响应",
      });
    });
  });

  describe("边界情况", () => {
    it("应该正确处理只包含描述和摘要的简单操作", async () => {
      const sourceData = createSourceOperationData([
        "@operation get /health",
        "@summary 健康检查",
        "@description 检查服务的健康状态",
      ]);
      const result = await parser.compose(sourceData);

      expect(result.method).toBe("get");
      expect(result.path).toBe("/health");
      expect(result.operation.summary).toBe("健康检查");
      expect(result.operation.description).toBe("检查服务的健康状态");
      expect(result.operation.parameters).toBeUndefined();
      expect(result.operation.requestBody).toBeUndefined();
      expect(Object.keys(result.operation.responses || {})).toHaveLength(0);
    });

    it("应该正确处理只包含响应的操作", async () => {
      const sourceData = createSourceOperationData(["@response 200 成功", "@response 500 错误"]);
      const result = await parser.compose(sourceData);

      expect(result.method).toBeUndefined();
      expect(result.path).toBeUndefined();
      expect(result.operation.responses).toHaveProperty("200");
      expect(result.operation.responses).toHaveProperty("500");
    });

    it("应该正确处理包含callback的解析结果", async () => {
      const sourceData = createSourceOperationData([
        `@callback myCallback
        "{$request.body#/callbackUrl}":
          post:
            summary: "回调通知"
            responses:
              200:
                description: "处理成功"`,
      ]);
      const result = await parser.compose(sourceData);

      expect(result.operation.callbacks).toHaveProperty("myCallback");
      expect(result.operation.callbacks?.myCallback).toHaveProperty("{$request.body#/callbackUrl}");
    });

    it("应该正确处理包含security的解析结果", async () => {
      const sourceData = createSourceOperationData(["@security api_key read write"]);
      const result = await parser.compose(sourceData);

      expect(result.operation.security).toEqual([
        {
          api_key: ["read", "write"],
        },
      ]);
    });

    it("应该正确处理包含server的解析结果", async () => {
      const sourceData = createSourceOperationData([
        `@server https://api.example.com 生产环境服务器
         variables:
           version:
             default: v1
             description: API版本`,
      ]);
      const result = await parser.compose(sourceData);

      expect(result.operation.servers).toEqual([
        {
          url: "https://api.example.com",
          description: "生产环境服务器",
          variables: {
            version: {
              default: "v1",
              description: "API版本",
            },
          },
        },
      ]);
    });

    it("应该正确处理多个扩展标签的组合", async () => {
      const sourceData = createSourceOperationData([
        "@operation get /users",
        `@extensions
x-rate-limit: 100`,
        `@extensions
x-timeout: 30`,
      ]);
      const result = await parser.compose(sourceData);

      expect(result.operation).toHaveProperty("x-rate-limit", 100);
      expect(result.operation).toHaveProperty("x-timeout", 30);
    });

    it("应该正确进行 requestBody 的浅合并", async () => {
      // 创建一个模拟的框架分析器，提供基础的 requestBody
      class MockFrameworkAnalyzer extends FrameworkAnalyzer {
        frameworkName = "mock";

        canAnalyze() {
          return true;
        }

        async analyze(_node: Node) {
          return {
            method: "post" as HttpMethod,
            path: "/users",
            requestBody: {
              description: "来自框架分析的描述",
              required: false,
              content: {
                "application/json": {
                  schema: {
                    type: "object" as const,
                    properties: {
                      name: { type: "string" as const },
                    },
                  },
                },
                "application/xml": {
                  schema: {
                    type: "object" as const,
                    properties: {
                      id: { type: "number" as const },
                    },
                  },
                },
              },
            },
          };
        }
      }

      // 注册模拟分析器
      const mockFrameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();
      mockFrameworkAnalyzerRegistry.register(new MockFrameworkAnalyzer(context));
      const mockParser = new OperationComposer(tagParserRegistry, mockFrameworkAnalyzerRegistry);

      const sourceData = createSourceOperationData([
        `@requestBody 来自标签解析的描述
         required: true
         content:
           application/json:
             schema:
               type: object
               properties:
                 email:
                   type: string
           text/plain:
             schema:
               type: string`,
      ]);

      const result = await mockParser.compose(sourceData);
      const requestBody = result.operation.requestBody as RequestBodyObject;

      // 验证浅合并结果
      expect(requestBody.description).toBe("来自标签解析的描述"); // 标签解析优先
      expect(requestBody.required).toBe(true); // 标签解析优先
      expect(requestBody.content).toHaveProperty("application/json");
      expect(requestBody.content).toHaveProperty("application/xml"); // 来自框架分析
      expect(requestBody.content).toHaveProperty("text/plain"); // 来自标签解析

      // 验证 application/json 内容被标签解析覆盖
      expect(requestBody.content["application/json"].schema).toEqual({
        type: "object",
        properties: {
          email: { type: "string" },
        },
      });

      // 验证 application/xml 内容保留自框架分析
      expect(requestBody.content["application/xml"].schema).toEqual({
        type: "object",
        properties: {
          id: { type: "number" },
        },
      });

      // 验证 text/plain 内容来自标签解析
      expect(requestBody.content["text/plain"].schema).toEqual({
        type: "string",
      });
    });

    it("应该正确处理单个 mediaType 的智能合并", async () => {
      // 创建一个模拟的框架分析器，提供基础的 requestBody
      class MockFrameworkAnalyzer extends FrameworkAnalyzer {
        frameworkName = "mock";

        canAnalyze() {
          return true;
        }

        async analyze(_node: Node) {
          return {
            method: "post" as HttpMethod,
            path: "/users",
            requestBody: {
              description: "来自框架分析的描述",
              required: false,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/UserLoginDto",
                  },
                },
              },
            },
          };
        }
      }

      // 注册模拟分析器
      const mockFrameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();
      mockFrameworkAnalyzerRegistry.register(new MockFrameworkAnalyzer(context));
      const mockParser = new OperationComposer(tagParserRegistry, mockFrameworkAnalyzerRegistry);

      const sourceData = createSourceOperationData([
        `@requestBody 来自标签解析的描述
         required: true
         content:
           application/xml: {}`,
      ]);

      const result = await mockParser.compose(sourceData);
      const requestBody = result.operation.requestBody as RequestBodyObject;

      // 验证智能合并结果：使用标签的 mediaType，但保留 AST 的 schema
      expect(requestBody.description).toBe("来自标签解析的描述");
      expect(requestBody.required).toBe(true);
      expect(requestBody.content).toHaveProperty("application/xml");
      expect(requestBody.content).not.toHaveProperty("application/json"); // 原来的 mediaType 被替换

      // 验证 schema 被保留并应用到新的 mediaType
      expect(requestBody.content["application/xml"].schema).toEqual({
        $ref: "#/components/schemas/UserLoginDto",
      });
    });

    it("应该在标签已有完整 schema 时不进行 schema 合并", async () => {
      // 创建一个模拟的框架分析器，提供基础的 requestBody
      class MockFrameworkAnalyzer extends FrameworkAnalyzer {
        frameworkName = "mock";

        canAnalyze() {
          return true;
        }

        async analyze(_node: Node) {
          return {
            method: "post" as HttpMethod,
            path: "/users",
            requestBody: {
              description: "来自框架分析的描述",
              required: false,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/UserLoginDto",
                  },
                },
              },
            },
          };
        }
      }

      // 注册模拟分析器
      const mockFrameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();
      mockFrameworkAnalyzerRegistry.register(new MockFrameworkAnalyzer(context));
      const mockParser = new OperationComposer(tagParserRegistry, mockFrameworkAnalyzerRegistry);

      const sourceData = createSourceOperationData([
        `@requestBody 来自标签解析的描述
         required: true
         content:
           application/xml:
             schema:
               type: object
               properties:
                 customField:
                   type: string`,
      ]);

      const result = await mockParser.compose(sourceData);
      const requestBody = result.operation.requestBody as RequestBodyObject;

      // 验证标签的完整 schema 被保留，不使用 AST 的 schema
      expect(requestBody.content).toHaveProperty("application/xml");
      expect(requestBody.content).not.toHaveProperty("application/json");
      expect(requestBody.content["application/xml"].schema).toEqual({
        type: "object",
        properties: {
          customField: { type: "string" },
        },
      });
    });
  });

  describe("错误处理", () => {
    it("应该在解析器抛出错误时正确传播错误", async () => {
      const sourceData = createSourceOperationData(["@operation"]);
      const result = await parser.compose(sourceData);

      expect(result).toHaveProperty("operation");
      expect(result.operation).toHaveProperty("responses");
    });

    it("应该在禁用AST分析时对空@operation标签抛出错误", async () => {
      const contextWithoutAST = createParseContext({ enableASTAnalysis: false });
      const tagParserRegistryWithoutAST = new TagParserRegistry();

      tagParserRegistryWithoutAST.register(new ParameterTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new RequestBodyTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new ResponseTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new ExternalDocsTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new SecurityTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new ServerTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new CallbackTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new OperationIdTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new DeprecatedTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new ExtensionsTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new ResponsesExtensionsTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new DescriptionTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new SummaryTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new TagsTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new OperationTagParser(contextWithoutAST));

      const parserWithoutAST = new OperationComposer(
        tagParserRegistryWithoutAST,
        frameworkAnalyzerRegistry,
      );
      const sourceData = createSourceOperationData(["@operation"]);

      await expect(async () => await parserWithoutAST.compose(sourceData)).rejects.toThrow();
    });

    it("应该在参数解析器抛出错误时正确传播错误", async () => {
      const sourceData = createSourceOperationData(["@parameter"]);

      await expect(async () => await parser.compose(sourceData)).rejects.toThrow(/不能为空/);
    });

    it("应该在响应解析器抛出错误时正确传播错误", async () => {
      const sourceData = createSourceOperationData(["@response"]);

      await expect(async () => await parser.compose(sourceData)).rejects.toThrow(/不能为空/);
    });

    it("应该在请求体解析器抛出错误时正确传播错误（禁用AST分析时）", async () => {
      // 创建禁用AST分析的上下文
      const contextWithoutAST = createParseContext({ enableASTAnalysis: false });
      const tagParserRegistryWithoutAST = new TagParserRegistry();

      tagParserRegistryWithoutAST.register(new ParameterTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new RequestBodyTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new ResponseTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new ExternalDocsTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new SecurityTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new ServerTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new CallbackTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new OperationIdTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new DeprecatedTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new ExtensionsTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new ResponsesExtensionsTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new DescriptionTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new SummaryTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new TagsTagParser(contextWithoutAST));
      tagParserRegistryWithoutAST.register(new OperationTagParser(contextWithoutAST));

      const parserWithoutAST = new OperationComposer(
        tagParserRegistryWithoutAST,
        frameworkAnalyzerRegistry,
      );
      const sourceData = createSourceOperationData(["@requestBody 描述但没有YAML"]);

      await expect(async () => await parserWithoutAST.compose(sourceData)).rejects.toThrow(
        /标签必须包含 YAML 参数/,
      );
    });

    it("应该在启用AST分析时允许没有YAML参数的requestBody", async () => {
      const sourceData = createSourceOperationData(["@requestBody 描述但没有YAML"]);
      const result = await parser.compose(sourceData);

      expect(result).toHaveProperty("operation");
      expect(result.operation.requestBody).toEqual({
        description: "描述但没有YAML",
        content: {},
      });
    });
  });
});
