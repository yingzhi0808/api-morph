import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { OperationTagParser } from "./OperationTagParser";

describe("OperationTagParser", () => {
  let parser: OperationTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new OperationTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["operation"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析 @operation 标签", async () => {
      const tag = createJSDocTag("@operation get /users");
      const result = await parser.parse(tag);
      expect(result).toEqual({ method: "get", path: "/users" });
    });

    it("应该正确解析所有支持的 HTTP 方法", async () => {
      const methods = ["get", "post", "put", "delete", "patch", "options", "head", "trace"];

      for (const method of methods) {
        const tag = createJSDocTag(`@operation ${method} /test`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          method: method.toLowerCase(),
          path: "/test",
        });
      }
    });

    it("应该在 HTTP 方法无效时抛出错误", async () => {
      const tag = createJSDocTag("@operation invalid /users");
      await expect(parser.parse(tag)).rejects.toThrow(/@operation 标签包含不支持的 HTTP 方法/);
    });

    it("应该在 HTTP 方法为空时抛出错误", async () => {
      const tag = createJSDocTag("@operation");
      await expect(parser.parse(tag)).rejects.toThrow(/@operation 标签 method 不能为空/);
    });

    it("应该在路径为空时抛出错误", async () => {
      const tag = createJSDocTag("@operation get");
      await expect(parser.parse(tag)).rejects.toThrow(/@operation 标签 path 不能为空/);
    });

    it("应该在路径不以 / 开头时抛出错误", async () => {
      const tag = createJSDocTag("@operation get users");
      await expect(parser.parse(tag)).rejects.toThrow(/@operation 标签 path 格式不正确/);
    });
  });
});
