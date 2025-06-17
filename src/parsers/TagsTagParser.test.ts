import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { TagsTagParser } from "./TagsTagParser";

describe("TagsTagParser", () => {
  let parser: TagsTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new TagsTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["tags"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析单个标签", async () => {
      const tag = createJSDocTag("@tags user");
      const result = await parser.parse(tag);
      expect(result).toEqual({ tags: ["user"] });
    });

    it("应该正确解析多个标签", async () => {
      const tag = createJSDocTag("@tags user authentication admin");
      const result = await parser.parse(tag);
      expect(result).toEqual({ tags: ["user", "authentication", "admin"] });
    });

    it("应该在标签为空时抛出错误", async () => {
      const tag = createJSDocTag("@tags");
      await expect(parser.parse(tag)).rejects.toThrow(/@tags 标签至少需要一个标签/);
    });
  });
});
