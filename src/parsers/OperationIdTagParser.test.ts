import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { OperationIdTagParser } from "./OperationIdTagParser";

describe("OperationIdTagParser", () => {
  let parser: OperationIdTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new OperationIdTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["operationId"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析有效的操作ID", async () => {
      const validIds = ["getUserList", "get_user_list", "_privateMethod", "method123", "a", "_"];

      for (const operationId of validIds) {
        const tag = createJSDocTag(`@operationId ${operationId}`);
        const result = await parser.parse(tag);
        expect(result).toEqual({ operationId });
      }
    });

    it("应该在操作ID为空时抛出错误", async () => {
      const tag = createJSDocTag("@operationId");
      await expect(parser.parse(tag)).rejects.toThrow(/@operationId 标签 operationId 不能为空/);
    });

    it("应该在操作ID格式无效时抛出错误", async () => {
      const invalidIds = ["123invalid", "invalid-id", "invalid.id", "invalid@id"];

      for (const operationId of invalidIds) {
        const tag = createJSDocTag(`@operationId ${operationId}`);
        await expect(parser.parse(tag)).rejects.toThrow(/@operationId 标签 operationId 格式不正确/);
      }
    });

    it("应该正确处理包含空格的操作ID（只取第一个单词）", async () => {
      const tag = createJSDocTag("@operationId valid invalid");
      const result = await parser.parse(tag);
      expect(result).toEqual({ operationId: "valid" });
    });
  });
});
