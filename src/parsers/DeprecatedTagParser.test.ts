import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { DeprecatedTagParser } from "./DeprecatedTagParser";

describe("DeprecatedTagParser", () => {
  let parser: DeprecatedTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new DeprecatedTagParser(context);
  });

  describe("基本properties属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["deprecated"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析 @deprecated 标签", async () => {
      const tag = createJSDocTag("@deprecated");
      const result = await parser.parse(tag);
      expect(result).toEqual({ deprecated: true });
    });

    it("应该在 @deprecated 标签包含内联参数时抛出错误", async () => {
      const tag = createJSDocTag("@deprecated true");
      await expect(parser.parse(tag)).rejects.toThrow(/@deprecated 标签不应包含任何参数/);
    });

    it("应该在 @deprecated 标签包含YAML参数时抛出错误", async () => {
      const tag = createJSDocTag(`@deprecated
        deprecated: true`);
      await expect(parser.parse(tag)).rejects.toThrow(/@deprecated 标签不应包含任何参数/);
    });
  });
});
