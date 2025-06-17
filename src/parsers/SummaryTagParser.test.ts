import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { SummaryTagParser } from "./SummaryTagParser";

describe("SummaryTagParser", () => {
  let parser: SummaryTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new SummaryTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["summary"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析 @summary 标签", async () => {
      const tag = createJSDocTag("@summary 用户登录接口");
      const result = await parser.parse(tag);
      expect(result).toEqual({ summary: "用户登录接口" });
    });

    it("应该在 summary 为空时抛出错误", async () => {
      const tag = createJSDocTag("@summary");
      await expect(parser.parse(tag)).rejects.toThrow(/@summary 标签 summary 不能为空/);
    });

    it("应该正确处理包含空格的 summary（只取第一个单词）", async () => {
      const tag = createJSDocTag("@summary valid invalid");
      const result = await parser.parse(tag);
      expect(result).toEqual({ summary: "valid" });
    });
  });
});
