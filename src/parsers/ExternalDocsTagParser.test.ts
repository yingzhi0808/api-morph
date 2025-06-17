import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { ExternalDocsTagParser } from "./ExternalDocsTagParser";

describe("ExternalDocsTagParser", () => {
  let parser: ExternalDocsTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new ExternalDocsTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["externalDocs"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析只有URL的外部文档", async () => {
      const tag = createJSDocTag(`@externalDocs https://docs.example.com`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        externalDocs: { url: "https://docs.example.com" },
      });
    });

    it("应该在没有URL时抛出错误", async () => {
      const tag = createJSDocTag(`@externalDocs
        x-version: "1.0"`);
      await expect(parser.parse(tag)).rejects.toThrow(/@externalDocs 标签 url 不能为空/);
    });

    it("应该在URL格式无效时抛出错误", async () => {
      const tag = createJSDocTag(`@externalDocs invalid-url`);
      await expect(parser.parse(tag)).rejects.toThrow(
        /@externalDocs 标签提供的 url 格式无效: "invalid-url"/,
      );
    });

    it("应该正确解析URL + 描述的外部文档", async () => {
      const tag = createJSDocTag(`@externalDocs https://docs.example.com 详细的API文档`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        externalDocs: {
          url: "https://docs.example.com",
          description: "详细的API文档",
        },
      });
    });

    it("应该允许yaml中的description覆盖内联参数中的description", async () => {
      const tag = createJSDocTag(`@externalDocs https://docs.example.com 内联描述
        description: "yaml中的描述"
        x-version: "1.0"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        externalDocs: {
          url: "https://docs.example.com",
          description: "yaml中的描述",
          "x-version": "1.0",
        },
      });
    });

    it("应该在没有内联描述时使用yaml中的description", async () => {
      const tag = createJSDocTag(`@externalDocs https://docs.example.com
        description: "仅来自yaml的描述"
        x-format: "openapi"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        externalDocs: {
          url: "https://docs.example.com",
          description: "仅来自yaml的描述",
          "x-format": "openapi",
        },
      });
    });

    it("应该正确解析扩展字段", async () => {
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

    it("应该正确解析URL + 描述 + 扩展字段的完整参数", async () => {
      const tag = createJSDocTag(`@externalDocs https://docs.example.com 完整的API文档
        x-version: "3.0"
        x-format: "openapi"
        x-language: "zh-CN"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        externalDocs: {
          url: "https://docs.example.com",
          description: "完整的API文档",
          "x-version": "3.0",
          "x-format": "openapi",
          "x-language": "zh-CN",
        },
      });
    });
  });
});
