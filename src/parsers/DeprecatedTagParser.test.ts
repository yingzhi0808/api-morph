import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { DeprecatedTagParser } from "./DeprecatedTagParser";

describe("DeprecatedTagParser", () => {
  let parser: DeprecatedTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new DeprecatedTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toContain("deprecated");
    });
  });

  describe("parse", () => {
    describe("parse @deprecated tag", () => {
      it("应该正确解析 @deprecated 标签", async () => {
        const tag = createJSDocTag("@deprecated");
        const result = await parser.parse(tag);
        expect(result).toEqual({ deprecated: true });
      });

      it("应该在 @deprecated 标签包含参数时抛出错误", async () => {
        const invalidTags = ["@deprecated true", "@deprecated 这个API已废弃", "@deprecated v2.0"];

        for (const tagContent of invalidTags) {
          const tag = createJSDocTag(tagContent);
          await expect(parser.parse(tag)).rejects.toThrow(/@deprecated 标签不应包含任何参数/);
        }
      });

      it("应该在 @deprecated 标签包含YAML参数时抛出错误", async () => {
        const tag = createJSDocTag(`@deprecated
        deprecated: true`);
        await expect(parser.parse(tag)).rejects.toThrow(/@deprecated 标签不应包含任何参数/);
      });
    });
  });
});
