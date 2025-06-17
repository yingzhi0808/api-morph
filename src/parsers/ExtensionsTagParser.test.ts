import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { ExtensionsTagParser } from "./ExtensionsTagParser";

describe("ExtensionsTagParser", () => {
  let parser: ExtensionsTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new ExtensionsTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["extensions"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析 @extensions 标签", async () => {
      const tag = createJSDocTag(`@extensions
x-code-samples: true
x-custom-header: custom-value
x-rate-limit: 100`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        extensions: {
          "x-code-samples": true,
          "x-custom-header": "custom-value",
          "x-rate-limit": 100,
        },
      });
    });

    it("应该在包含inline参数时抛出错误", async () => {
      const tag = createJSDocTag(`@extensions x-inline-param
x-valid: value`);
      await expect(parser.parse(tag)).rejects.toThrow(/@extensions 标签不应包含任何 inline 参数/);
    });

    it("应该在没有YAML内容时抛出错误", async () => {
      const tag = createJSDocTag("@extensions");
      await expect(parser.parse(tag)).rejects.toThrow(/@extensions 标签必须包含 YAML 参数/);
    });

    it("应该在扩展名不以 x- 开头时抛出错误", async () => {
      const tag = createJSDocTag(`@extensions
invalid-name: value
x-valid: value`);
      await expect(parser.parse(tag)).rejects.toThrow(/@extensions 标签的扩展名必须以 "x-" 开头/);
    });
  });
});
