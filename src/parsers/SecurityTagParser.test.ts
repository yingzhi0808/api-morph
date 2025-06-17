import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { SecurityTagParser } from "./SecurityTagParser";

describe("SecurityTagParser", () => {
  let parser: SecurityTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new SecurityTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["security"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析不带作用域的安全方案", async () => {
      const tag = createJSDocTag("@security bearerAuth");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        security: {
          bearerAuth: [],
        },
      });
    });

    it("应该正确解析带单个作用域的安全方案", async () => {
      const tag = createJSDocTag("@security oauth2 read");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        security: {
          oauth2: ["read"],
        },
      });
    });

    it("应该正确解析带多个作用域的安全方案", async () => {
      const tag = createJSDocTag("@security oauth2 read write admin");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        security: {
          oauth2: ["read", "write", "admin"],
        },
      });
    });

    it("应该在没有参数时抛出错误", async () => {
      const tag = createJSDocTag("@security");
      await expect(parser.parse(tag)).rejects.toThrow(/@security 标签 schemeName 不能为空/);
    });

    it("应该正确处理包含冒号的作用域", async () => {
      const tag = createJSDocTag("@security oauth2 user:read user:write admin:all");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        security: {
          oauth2: ["user:read", "user:write", "admin:all"],
        },
      });
    });

    it("应该正确处理包含斜杠的作用域", async () => {
      const tag = createJSDocTag("@security oauth2 api/read api/write api/delete");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        security: {
          oauth2: ["api/read", "api/write", "api/delete"],
        },
      });
    });
  });
});
