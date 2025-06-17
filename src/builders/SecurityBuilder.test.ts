import { describe, expect, it } from "vitest";
import { SecurityBuilder } from "./SecurityBuilder";

describe("SecurityBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建默认的空安全需求对象", () => {
      const builder = new SecurityBuilder();
      const result = builder.build();

      expect(result).toEqual({});
    });

    it("多次调用 build 应该返回不同的对象引用", () => {
      const builder = new SecurityBuilder();
      builder.addScopes("bearerAuth").addScopes("oauth2", ["read"]);

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe("addScopes", () => {
    it("应该添加不带作用域的安全需求", () => {
      const builder = new SecurityBuilder();
      const result = builder.addScopes("bearerAuth").build();

      expect(result).toEqual({
        bearerAuth: [],
      });
    });

    it("应该添加带作用域的安全需求", () => {
      const builder = new SecurityBuilder();
      const result = builder.addScopes("oauth2", ["read", "write"]).build();

      expect(result).toEqual({
        oauth2: ["read", "write"],
      });
    });

    it("应该添加多个不同的安全需求", () => {
      const builder = new SecurityBuilder();
      const result = builder
        .addScopes("bearerAuth")
        .addScopes("oauth2", ["read", "write"])
        .addScopes("apiKey", ["admin"])
        .build();

      expect(result).toEqual({
        bearerAuth: [],
        oauth2: ["read", "write"],
        apiKey: ["admin"],
      });
    });

    it("应该覆盖相同名称的安全需求", () => {
      const builder = new SecurityBuilder();
      const result = builder
        .addScopes("oauth2", ["read"])
        .addScopes("oauth2", ["read", "write"])
        .build();

      expect(result).toEqual({
        oauth2: ["read"],
      });
    });

    it("应该支持链式调用", () => {
      const builder = new SecurityBuilder();
      const returnValue = builder.addScopes("bearerAuth");

      expect(returnValue).toBe(builder);
    });
  });
});
