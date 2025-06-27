import { createParseContext } from "@tests/utils";
import type { JSDocTag, Node } from "ts-morph";
import { describe, expect, it } from "vitest";
import { FrameworkAnalyzer } from "@/analyzers/FrameworkAnalyzer";
import { type ParsedTagParams, TagParser } from "@/parsers/TagParser";
import { FrameworkAnalyzerRegistry } from "@/registry/FrameworkAnalyzerRegistry";
import { TagParserRegistry } from "@/registry/TagParserRegistry";
import type { RequestBodyObject } from "@/types/openapi";
import type { OperationData, ParseContext, SourceOperationData } from "@/types/parser";
import { OperationComposer } from "./OperationComposer";

class MockTagParser extends TagParser {
  readonly tags: string[];

  constructor(
    context: ParseContext,
    public readonly tagName: string,
    private readonly returnData: OperationData,
  ) {
    super(context);
    this.tags = [tagName];
  }

  parse(_tag: JSDocTag): OperationData {
    return this.returnData;
  }

  protected transformParams(_params: ParsedTagParams, _tag: JSDocTag) {
    return {};
  }
}

class MockFrameworkAnalyzer extends FrameworkAnalyzer {
  constructor(
    context: ParseContext,
    public readonly frameworkName: string,
    private readonly shouldAnalyze: boolean = true,
    private readonly returnData: OperationData = {},
  ) {
    super(context);
  }

  canAnalyze(_node: Node): boolean {
    return this.shouldAnalyze;
  }

  analyze(_node: Node): OperationData {
    return this.returnData;
  }
}

describe("OperationComposer", () => {
  const context = createParseContext();
  let tagParserRegistry: TagParserRegistry;
  let frameworkAnalyzerRegistry: FrameworkAnalyzerRegistry;
  let composer: OperationComposer;

  function createMockSourceData(tags: string[] = []): SourceOperationData {
    const mockTags = tags.map((tagContent) => ({
      getTagName: () => tagContent.split(" ")[0].replace("@", ""),
      getText: () => tagContent,
    })) as JSDocTag[];

    return {
      node: {} as Node,
      tags: mockTags,
    };
  }

  describe("compose", () => {
    it("应该正确组合代码分析和标签解析的结果", async () => {
      tagParserRegistry = new TagParserRegistry();
      frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();

      tagParserRegistry.register(
        new MockTagParser(context, "operation", {
          method: "post",
          path: "/users",
          summary: "标签摘要",
        }),
      );

      frameworkAnalyzerRegistry.register(
        new MockFrameworkAnalyzer(context, "express", true, {
          method: "get",
          path: "/api",
          description: "代码描述",
        }),
      );

      composer = new OperationComposer(tagParserRegistry, frameworkAnalyzerRegistry);
      const sourceData = createMockSourceData(["@operation post /users"]);

      const result = await composer.compose(sourceData);

      expect(result.method).toBe("post");
      expect(result.path).toBe("/users");
      expect(result.operation.summary).toBe("标签摘要");
      expect(result.operation.description).toBe("代码描述"); // 代码的描述应该保留
    });

    it("应该在没有框架分析器时仅使用标签解析结果", async () => {
      tagParserRegistry = new TagParserRegistry();
      frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();

      tagParserRegistry.register(
        new MockTagParser(context, "operation", {
          method: "get",
          path: "/test",
        }),
      );

      composer = new OperationComposer(tagParserRegistry, frameworkAnalyzerRegistry);
      const sourceData = createMockSourceData(["@operation get /test"]);

      const result = await composer.compose(sourceData);

      expect(result.method).toBe("get");
      expect(result.path).toBe("/test");
    });

    it("应该在没有匹配的框架分析器时仅使用标签解析结果", async () => {
      tagParserRegistry = new TagParserRegistry();
      frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();

      tagParserRegistry.register(
        new MockTagParser(context, "operation", {
          method: "delete",
          path: "/items",
        }),
      );

      frameworkAnalyzerRegistry.register(new MockFrameworkAnalyzer(context, "express", false));

      composer = new OperationComposer(tagParserRegistry, frameworkAnalyzerRegistry);
      const sourceData = createMockSourceData(["@operation delete /items"]);

      const result = await composer.compose(sourceData);

      expect(result.method).toBe("delete");
      expect(result.path).toBe("/items");
    });

    it("应该在找不到标签解析器时抛出错误", async () => {
      tagParserRegistry = new TagParserRegistry();
      frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();
      composer = new OperationComposer(tagParserRegistry, frameworkAnalyzerRegistry);

      const sourceData = createMockSourceData(["@unknownTag content"]);

      await expect(composer.compose(sourceData)).rejects.toThrow("未找到标签 @unknownTag 的解析器");
    });

    it("应该正确合并requestBody内容", async () => {
      tagParserRegistry = new TagParserRegistry();
      frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();

      // 代码分析提供schema
      frameworkAnalyzerRegistry.register(
        new MockFrameworkAnalyzer(context, "express", true, {
          requestBody: {
            content: {
              "application/xml": {
                schema: { type: "object", properties: { id: { type: "string" } } },
              },
            },
          },
        }),
      );

      // 标签解析提供不同的mediaType但没有schema
      tagParserRegistry.register(
        new MockTagParser(context, "requestBody", {
          requestBody: {
            description: "请求体",
            content: {
              "application/json": {
                example: { name: "test" },
              },
            },
          },
        }),
      );

      composer = new OperationComposer(tagParserRegistry, frameworkAnalyzerRegistry);
      const sourceData = createMockSourceData(["@requestBody content"]);

      const result = await composer.compose(sourceData);

      // 应该使用标签的mediaType但保留代码的schema
      const requestBody = result.operation.requestBody as RequestBodyObject;
      expect(requestBody?.content).toEqual({
        "application/json": {
          example: { name: "test" },
          schema: { type: "object", properties: { id: { type: "string" } } },
        },
      });
    });

    it("应该正确处理requestBody多项内容的叠加合并", async () => {
      tagParserRegistry = new TagParserRegistry();
      frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();

      frameworkAnalyzerRegistry.register(
        new MockFrameworkAnalyzer(context, "express", true, {
          requestBody: {
            content: {
              "application/xml": { schema: { type: "string" } },
            },
          },
        }),
      );

      tagParserRegistry.register(
        new MockTagParser(context, "requestBody", {
          requestBody: {
            content: {
              "application/json": { schema: { type: "object" } },
              "text/plain": { schema: { type: "string" } },
            },
          },
        }),
      );

      composer = new OperationComposer(tagParserRegistry, frameworkAnalyzerRegistry);
      const sourceData = createMockSourceData(["@requestBody content"]);

      const result = await composer.compose(sourceData);

      // 应该叠加合并所有内容类型
      const requestBody2 = result.operation.requestBody as RequestBodyObject;
      expect(requestBody2?.content).toEqual({
        "application/xml": { schema: { type: "string" } },
        "application/json": { schema: { type: "object" } },
        "text/plain": { schema: { type: "string" } },
      });
    });

    it("应该正确构建包含所有字段的操作", async () => {
      tagParserRegistry = new TagParserRegistry();
      frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();

      tagParserRegistry.register(
        new MockTagParser(context, "operation", {
          method: "post",
          path: "/complete",
          tags: ["tag1", "tag2"],
          summary: "完整测试",
          description: "完整的操作测试",
          operationId: "completeTest",
          externalDocs: { url: "https://example.com", description: "文档" },
          parameters: [{ name: "param1", in: "query", description: "参数1" }],
          requestBody: { description: "请求体", content: {} },
          responses: { "200": { description: "成功" } },
          callback: { name: "cb", callback: {} },
          deprecated: true,
          security: { apiKey: [] },
          servers: [{ url: "https://api.example.com" }],
          extensions: { "x-custom": "value" },
          responsesExtensions: { "x-response-custom": "value" },
        }),
      );

      composer = new OperationComposer(tagParserRegistry, frameworkAnalyzerRegistry);
      const sourceData = createMockSourceData(["@operation post /complete"]);

      const result = await composer.compose(sourceData);

      expect(result.method).toBe("post");
      expect(result.path).toBe("/complete");
      expect(result.operation.tags).toEqual(["tag1", "tag2"]);
      expect(result.operation.summary).toBe("完整测试");
      expect(result.operation.description).toBe("完整的操作测试");
      expect(result.operation.operationId).toBe("completeTest");
      expect(result.operation.externalDocs).toEqual({
        url: "https://example.com",
        description: "文档",
      });
      expect(result.operation.parameters).toHaveLength(1);
      expect(result.operation.requestBody).toEqual({ description: "请求体", content: {} });
      expect(result.operation.responses).toEqual({
        "200": { description: "成功" },
        "x-response-custom": "value",
      });
      expect(result.operation.deprecated).toBe(true);
      expect(result.operation.security).toEqual([{ apiKey: [] }]);
      expect(result.operation.servers).toEqual([{ url: "https://api.example.com" }]);
      expect(result.operation["x-custom"]).toBe("value");
    });

    it("应该在标签有完整schema时直接使用标签内容", async () => {
      tagParserRegistry = new TagParserRegistry();
      frameworkAnalyzerRegistry = new FrameworkAnalyzerRegistry();

      // 代码分析提供schema
      frameworkAnalyzerRegistry.register(
        new MockFrameworkAnalyzer(context, "express", true, {
          requestBody: {
            content: {
              "application/xml": {
                schema: { type: "string" },
              },
            },
          },
        }),
      );

      // 标签解析提供完整的schema
      tagParserRegistry.register(
        new MockTagParser(context, "requestBody", {
          requestBody: {
            content: {
              "application/json": {
                schema: { type: "object", properties: { name: { type: "string" } } },
              },
            },
          },
        }),
      );

      composer = new OperationComposer(tagParserRegistry, frameworkAnalyzerRegistry);
      const sourceData = createMockSourceData(["@requestBody content"]);

      const result = await composer.compose(sourceData);

      // 应该直接使用标签的内容，因为标签已有完整schema
      const requestBody = result.operation.requestBody as RequestBodyObject;
      expect(requestBody?.content).toEqual({
        "application/json": {
          schema: { type: "object", properties: { name: { type: "string" } } },
        },
      });
    });
  });
});
