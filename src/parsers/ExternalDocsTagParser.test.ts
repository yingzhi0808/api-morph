import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { JSDocTagName } from "@/constants";
import { ExternalDocsTagParser } from "./ExternalDocsTagParser";

describe("ExternalDocsTagParser", () => {
  let parser: ExternalDocsTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new ExternalDocsTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual([JSDocTagName.EXTERNAL_DOCS]);
    });
  });

  describe("parse", () => {
    describe("基本格式解析", () => {
      it("应该正确解析只有URL的外部文档", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com
        x-version: "1.0"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com",
            "x-version": "1.0",
          },
        });
      });

      it("应该正确解析URL + 描述的外部文档", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com 详细的API文档
        x-format: "markdown"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com",
            description: "详细的API文档",
            "x-format": "markdown",
          },
        });
      });

      it("应该正确解析多词描述", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com 这是一个详细的API文档说明
        x-language: "zh-CN"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com",
            description: "这是一个详细的API文档说明",
            "x-language": "zh-CN",
          },
        });
      });
    });

    describe("扩展字段解析", () => {
      it("应该正确解析单个扩展字段", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com
        x-version: "2.0"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com",
            "x-version": "2.0",
          },
        });
      });

      it("应该正确解析多个扩展字段", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com
        x-version: "2.0"
        x-format: "openapi"
        x-language: "zh-CN"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com",
            "x-version": "2.0",
            "x-format": "openapi",
            "x-language": "zh-CN",
          },
        });
      });

      it("应该正确解析不同类型的扩展字段值", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com
        x-string: "字符串值"
        x-number: 42
        x-boolean: true
        x-array:
          - item1
          - item2
          - item3
        x-object:
          key1: value1
          key2: value2`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com",
            "x-string": "字符串值",
            "x-number": 42,
            "x-boolean": true,
            "x-array": ["item1", "item2", "item3"],
            "x-object": {
              key1: "value1",
              key2: "value2",
            },
          },
        });
      });

      it("应该忽略非扩展字段", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com
        x-valid: "valid extension"
        invalid-field: "should be ignored"
        another-field: "also ignored"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com",
            "x-valid": "valid extension",
          },
        });
      });
    });

    describe("完整配置解析", () => {
      it("应该正确解析URL + 描述 + 扩展字段的完整配置", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com 完整的API文档
        x-version: "3.0"
        x-format: "openapi"
        x-language: "zh-CN"
        x-metadata:
          author: "API Team"
          lastUpdated: "2024-01-01"
          tags:
            - api
            - documentation
        x-sections:
          authentication: "/auth"
          examples: "/examples"
          troubleshooting: "/troubleshooting"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com",
            description: "完整的API文档",
            "x-version": "3.0",
            "x-format": "openapi",
            "x-language": "zh-CN",
            "x-metadata": {
              author: "API Team",
              lastUpdated: "2024-01-01",
              tags: ["api", "documentation"],
            },
            "x-sections": {
              authentication: "/auth",
              examples: "/examples",
              troubleshooting: "/troubleshooting",
            },
          },
        });
      });

      it("应该正确解析复杂的嵌套扩展配置", async () => {
        const tag = createJSDocTag(`@externalDocs https://api-docs.example.com
        x-documentation:
          structure:
            overview: "/overview"
            quickstart: "/quickstart"
            reference: "/reference"
          features:
            - interactive-examples
            - code-snippets
            - postman-collection
          support:
            email: "support@example.com"
            forum: "https://forum.example.com"
            chat: "https://chat.example.com"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://api-docs.example.com",
            "x-documentation": {
              structure: {
                overview: "/overview",
                quickstart: "/quickstart",
                reference: "/reference",
              },
              features: ["interactive-examples", "code-snippets", "postman-collection"],
              support: {
                email: "support@example.com",
                forum: "https://forum.example.com",
                chat: "https://chat.example.com",
              },
            },
          },
        });
      });
    });

    describe("错误处理", () => {
      it("应该在没有参数且没有YAML时抛出错误", async () => {
        const tag = createJSDocTag("@externalDocs");
        await expect(parser.parse(tag)).rejects.toThrow(/@externalDocs 标签 url 不能为空/);
      });

      it("应该在没有URL时抛出错误", async () => {
        const tag = createJSDocTag(`@externalDocs
        x-version: "1.0"`);
        await expect(parser.parse(tag)).rejects.toThrow(/@externalDocs 标签 url 不能为空/);
      });

      it("应该在URL格式无效时抛出错误", async () => {
        const invalidUrls = ["invalid-url", "not-a-url", "://invalid", "ftp://"];

        for (const url of invalidUrls) {
          const tag = createJSDocTag(`@externalDocs ${url}
          x-version: "1.0"`);
          await expect(parser.parse(tag)).rejects.toThrow(
            new RegExp(
              `@externalDocs 标签提供的 url 格式无效: "${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
            ),
          );
        }
      });

      it("应该在相对URL时抛出错误", async () => {
        const tag = createJSDocTag(`@externalDocs /docs/api
        x-version: "1.0"`);
        await expect(parser.parse(tag)).rejects.toThrow(
          /@externalDocs 标签提供的 url 格式无效: "\/docs\/api"/,
        );
      });

      it("应该在没有协议的URL时抛出错误", async () => {
        const tag = createJSDocTag(`@externalDocs docs.example.com
        x-version: "1.0"`);
        await expect(parser.parse(tag)).rejects.toThrow(
          /@externalDocs 标签提供的 url 格式无效: "docs.example.com"/,
        );
      });
    });

    describe("边界情况", () => {
      it("应该正确处理包含端口的URL", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com:8080
        x-port: 8080`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com:8080",
            "x-port": 8080,
          },
        });
      });

      it("应该正确处理包含路径的URL", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com/api/v1
        x-path: "/api/v1"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com/api/v1",
            "x-path": "/api/v1",
          },
        });
      });

      it("应该正确处理包含查询参数的URL", async () => {
        const tag =
          createJSDocTag(`@externalDocs https://docs.example.com/api?version=v1&format=json
        x-query: "version=v1&format=json"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com/api?version=v1&format=json",
            "x-query": "version=v1&format=json",
          },
        });
      });

      it("应该正确处理包含锚点的URL", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com/api#section
        x-anchor: "section"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com/api#section",
            "x-anchor": "section",
          },
        });
      });

      it("应该正确处理Unicode字符的描述", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com API文档
        x-unicode: "支持Unicode字符 ✨"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com",
            description: "API文档",
            "x-unicode": "支持Unicode字符 ✨",
          },
        });
      });

      it("应该正确处理空字符串描述", async () => {
        const tag = createJSDocTag(`@externalDocs https://docs.example.com ""
        x-empty-description: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: "https://docs.example.com",
            "x-empty-description": true,
          },
        });
      });

      it("应该正确处理不同协议的URL", async () => {
        const protocols = ["https://", "http://", "ftp://", "ftps://"];

        for (const protocol of protocols) {
          const url = `${protocol}docs.example.com`;
          const tag = createJSDocTag(`@externalDocs ${url}
          x-protocol: "${protocol.slice(0, -3)}"`);
          const result = await parser.parse(tag);
          expect(result).toEqual({
            externalDocs: {
              url,
              "x-protocol": protocol.slice(0, -3),
            },
          });
        }
      });

      it("应该正确处理复杂的URL结构", async () => {
        const complexUrl =
          "https://user:pass@docs.example.com:8080/api/v1/docs?lang=zh&format=json#overview";
        const tag = createJSDocTag(`@externalDocs ${complexUrl}
        x-complex: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          externalDocs: {
            url: complexUrl,
            "x-complex": true,
          },
        });
      });
    });
  });
});
