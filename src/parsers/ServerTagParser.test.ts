import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { ServerTagParser } from "./ServerTagParser";

describe("ServerTagParser", () => {
  let parser: ServerTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new ServerTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["server"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析只有URL的参数", async () => {
      const tag = createJSDocTag(`@server https://api.example.com`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        server: { url: "https://api.example.com" },
      });
    });

    it("应该在没有 URL 时抛出错误", async () => {
      const tag = createJSDocTag(`@server
        x-provider: "test"`);
      await expect(parser.parse(tag)).rejects.toThrow(/@server 标签 url 不能为空/);
    });

    it("应该在 URL 格式无效时抛出错误", async () => {
      const tag = createJSDocTag(`@server invalid-url
        x-provider: "test"`);
      await expect(parser.parse(tag)).rejects.toThrow(
        /@server 标签提供的 url 格式无效: "invalid-url"/,
      );
    });

    it("应该正确解析 URL + 描述参数", async () => {
      const tag = createJSDocTag("@server https://api.example.com 生产环境服务器");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        server: {
          url: "https://api.example.com",
          description: "生产环境服务器",
        },
      });
    });

    it("应该正确解析 URL + 变量参数", async () => {
      const tag = createJSDocTag(`@server https://api.example.com
        variables:
          version:
            default: v1
            description: API版本`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        server: {
          url: "https://api.example.com",
          variables: {
            version: {
              default: "v1",
              description: "API版本",
            },
          },
        },
      });
    });

    it("应该正确解析 URL + 扩展字段参数", async () => {
      const tag = createJSDocTag(`@server https://api.example.com
        x-environment: production
        x-region: us-east-1`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        server: {
          url: "https://api.example.com",
          "x-environment": "production",
          "x-region": "us-east-1",
        },
      });
    });

    it("应该正确解析 URL + 描述 + 变量 + 扩展字段的完整参数", async () => {
      const tag = createJSDocTag(`@server https://api.example.com 生产环境API服务器
        variables:
          version:
            default: v1
            enum: [v1, v2]
            description: API版本号
          environment:
            default: prod
            enum: [dev, staging, prod]
        x-environment: production
        x-region: us-east-1
        x-load-balancer: true`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        server: {
          url: "https://api.example.com",
          description: "生产环境API服务器",
          variables: {
            version: {
              default: "v1",
              enum: ["v1", "v2"],
              description: "API版本号",
            },
            environment: {
              default: "prod",
              enum: ["dev", "staging", "prod"],
            },
          },
          "x-environment": "production",
          "x-region": "us-east-1",
          "x-load-balancer": true,
        },
      });
    });

    it("应该允许 YAML 中的 description 覆盖内联参数的 description", async () => {
      const tag = createJSDocTag(`@server https://api.example.com 内联描述
        description: YAML中的描述
        x-provider: aws`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        server: {
          url: "https://api.example.com",
          description: "YAML中的描述",
          "x-provider": "aws",
        },
      });
    });

    it("应该忽略非扩展字段的无效字段", async () => {
      const tag = createJSDocTag(`@server https://api.example.com
        invalidField: "should be ignored"
        x-valid: "should be included"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        server: {
          url: "https://api.example.com",
          "x-valid": "should be included",
        },
      });
    });
  });
});
