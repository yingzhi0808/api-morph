import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { JSDocTagName } from "@/constants";
import { SecurityTagParser } from "./SecurityTagParser";

describe("SecurityTagParser", () => {
  let parser: SecurityTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new SecurityTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual([JSDocTagName.SECURITY]);
    });
  });

  describe("parse", () => {
    describe("参数格式解析", () => {
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

      it("应该正确解析 apiKey 安全方案", async () => {
        const tag = createJSDocTag("@security apiKey");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          security: {
            apiKey: [],
          },
        });
      });

      it("应该正确解析 basicAuth 安全方案", async () => {
        const tag = createJSDocTag("@security basicAuth");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          security: {
            basicAuth: [],
          },
        });
      });

      it("应该正确处理带引号的方案名称", async () => {
        const tag = createJSDocTag('@security "bearerAuth" read');
        const result = await parser.parse(tag);
        expect(result).toEqual({
          security: {
            bearerAuth: ["read"],
          },
        });
      });

      it("应该在方案名称包含特殊字符时抛出错误", async () => {
        const tag = createJSDocTag("@security custom-bearer-auth read write");
        await expect(parser.parse(tag)).rejects.toThrow(
          /@security 标签 schemeName 格式不正确："custom-bearer-auth"，必须是有效的标识符/,
        );
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

    describe("错误处理", () => {
      it("应该在没有参数时抛出错误", async () => {
        const tag = createJSDocTag("@security");
        await expect(parser.parse(tag)).rejects.toThrow(/@security 标签 schemeName 不能为空/);
      });

      it("应该在方案名称为空时抛出错误", async () => {
        const tag = createJSDocTag("@security   ");
        await expect(parser.parse(tag)).rejects.toThrow(/@security 标签 schemeName 不能为空/);
      });

      it("应该在检测到 YAML 格式时抛出错误（缺少方案名称）", async () => {
        const tag = createJSDocTag(`@security
        bearerAuth: []`);
        await expect(parser.parse(tag)).rejects.toThrow(/@security 标签 schemeName 不能为空/);
      });
    });

    describe("边界情况", () => {
      it("应该正确处理空行的标签", async () => {
        const tag = createJSDocTag(`@security bearerAuth


        `);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          security: {
            bearerAuth: [],
          },
        });
      });

      it("应该正确处理方案名称为空字符串的情况", async () => {
        // 空引号会被 tokenizeString 过滤掉，所以这个测试应该解析为 ["read", "write"]
        const tag = createJSDocTag("@security '' read write");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          security: {
            read: ["write"],
          },
        });
      });
    });

    describe("真实场景测试", () => {
      it("应该正确解析 JWT Bearer 认证", async () => {
        const tag = createJSDocTag("@security bearerAuth");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          security: {
            bearerAuth: [],
          },
        });
      });

      it("应该正确解析 OAuth2 认证带作用域", async () => {
        const tag = createJSDocTag("@security oauth2 user:read user:write");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          security: {
            oauth2: ["user:read", "user:write"],
          },
        });
      });

      it("应该正确解析 API Key 认证", async () => {
        const tag = createJSDocTag("@security apiKey");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          security: {
            apiKey: [],
          },
        });
      });

      it("应该正确解析复杂的作用域组合", async () => {
        const tag = createJSDocTag("@security oauth2 user:read user:write admin:all api:manage");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          security: {
            oauth2: ["user:read", "user:write", "admin:all", "api:manage"],
          },
        });
      });
    });
  });
});
