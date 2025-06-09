import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { SummaryTagParser } from "./SummaryTagParser";

describe("SummaryTagParser", () => {
  let parser: SummaryTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new SummaryTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toContain("summary");
    });
  });

  describe("parse", () => {
    it("应该正确解析有效的 @summary 标签", async () => {
      const tag = createJSDocTag("@summary 用户登录接口");
      const result = await parser.parse(tag);
      expect(result).toEqual({ summary: "用户登录接口" });
    });

    it("应该正确解析多个单词的 @summary 标签", async () => {
      const tag = createJSDocTag("@summary 这是一个用户登录接口");
      const result = await parser.parse(tag);
      expect(result).toEqual({ summary: "这是一个用户登录接口" });
    });

    it("应该正确处理包含特殊字符的 @summary 标签", async () => {
      const tag = createJSDocTag("@summary 用户登录接口 - 支持用户名/密码登录");
      const result = await parser.parse(tag);
      expect(result).toEqual({ summary: "用户登录接口 - 支持用户名/密码登录" });
    });

    it("应该正确处理包含Unicode字符的 @summary 标签", async () => {
      const tag = createJSDocTag("@summary 用户登录接口🚀");
      const result = await parser.parse(tag);
      expect(result).toEqual({ summary: "用户登录接口🚀" });
    });

    it("应该在 summary 为空时抛出错误", async () => {
      const tag = createJSDocTag("@summary");
      await expect(parser.parse(tag)).rejects.toThrow(/@summary 标签 summary 不能为空/);
    });

    it("应该在 summary 只包含空格时抛出错误", async () => {
      const tag = createJSDocTag("@summary   ");
      await expect(parser.parse(tag)).rejects.toThrow(/@summary 标签 summary 不能为空/);
    });
  });
});
