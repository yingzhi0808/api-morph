import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { ResponsesExtensionsTagParser } from "./ResponsesExtensionsTagParser";

describe("ResponsesExtensionsTagParser", () => {
  let parser: ResponsesExtensionsTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new ResponsesExtensionsTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toContain("responsesExtensions");
    });
  });

  describe("parse", () => {
    describe("parse @responsesExtensions tag", () => {
      it("应该正确解析单个响应扩展标签", async () => {
        const tag = createJSDocTag(`@responsesExtensions
x-nullable: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responsesExtensions: {
            "x-nullable": true,
          },
        });
      });

      it("应该正确解析多个响应扩展标签", async () => {
        const tag = createJSDocTag(`@responsesExtensions
x-response-time: fast
x-cache-control: no-cache
x-custom-header: custom-value`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responsesExtensions: {
            "x-response-time": "fast",
            "x-cache-control": "no-cache",
            "x-custom-header": "custom-value",
          },
        });
      });

      it("应该正确解析不同类型的响应扩展值", async () => {
        const tag = createJSDocTag(`@responsesExtensions
x-response-time: fast
x-cache-control: no-cache
x-custom-header: custom-value
x-timeout: 30
x-retry: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          responsesExtensions: {
            "x-response-time": "fast",
            "x-cache-control": "no-cache",
            "x-custom-header": "custom-value",
            "x-timeout": 30,
            "x-retry": true,
          },
        });
      });

      it("应该在包含inline参数时抛出错误", async () => {
        const tag = createJSDocTag(`@responsesExtensions x-inline-param
x-valid: value`);
        await expect(parser.parse(tag)).rejects.toThrow(
          /@responsesExtensions 标签不应包含任何 inline 参数/,
        );
      });

      it("应该在没有YAML内容时抛出错误", async () => {
        const tag = createJSDocTag("@responsesExtensions");
        await expect(parser.parse(tag)).rejects.toThrow(
          /@responsesExtensions 标签必须包含 YAML 参数/,
        );
      });

      it("应该在扩展名不以 x- 开头时抛出错误", async () => {
        const tag = createJSDocTag(`@responsesExtensions
invalid-name: value
x-valid: value`);
        await expect(parser.parse(tag)).rejects.toThrow(
          /@responsesExtensions 标签的扩展名必须以 "x-" 开头/,
        );
      });
    });
  });
});
