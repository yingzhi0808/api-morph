import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { DescriptionTagParser } from "./DescriptionTagParser";

describe("DescriptionTagParser", () => {
  let parser: DescriptionTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new DescriptionTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["description"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析 @description 标签", async () => {
      const tag = createJSDocTag("@description 返回系统中所有用户的分页列表");
      const result = await parser.parse(tag);
      expect(result).toEqual({ description: "返回系统中所有用户的分页列表" });
    });

    it("应该正确处理多个单词的描述", async () => {
      const tag = createJSDocTag("@description 返回 系统中 所有用户 的分页列表");
      const result = await parser.parse(tag);
      expect(result).toEqual({ description: "返回 系统中 所有用户 的分页列表" });
    });

    it("应该正确处理多行描述", async () => {
      const tag = createJSDocTag(`@description 返回系统中所有用户的分页列表
         *
         * 此接口支持以下功能：
         * - 分页查询，默认每页20条记录
         * - 按用户名、邮箱等字段排序
         * - 支持多种筛选条件
         *
         * 注意：需要管理员权限才能访问`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        description:
          "返回系统中所有用户的分页列表\n\n此接口支持以下功能：\n- 分页查询，默认每页20条记录\n- 按用户名、邮箱等字段排序\n- 支持多种筛选条件\n\n注意：需要管理员权限才能访问",
      });
    });

    it("应该在描述为空时抛出错误", async () => {
      const tag = createJSDocTag("@description");
      await expect(parser.parse(tag)).rejects.toThrow(/@description 标签 description 不能为空/);
    });

    it("应该在描述只有空格时抛出错误", async () => {
      const tag = createJSDocTag("@description   ");
      await expect(parser.parse(tag)).rejects.toThrow(/@description 标签 description 不能为空/);
    });
  });
});
