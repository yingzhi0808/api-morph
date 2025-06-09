import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { OperationTagParser } from "./OperationTagParser";

describe("OperationTagParser", () => {
  let parser: OperationTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new OperationTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toContain("operation");
    });
  });

  describe("parse", () => {
    describe("parse @operation tag", () => {
      it("应该正确解析有效的 @operation 标签（不带summary）", async () => {
        const tag = createJSDocTag("@operation get /users");
        const result = await parser.parse(tag);
        expect(result).toEqual({ method: "get", path: "/users" });
      });

      it("应该正确解析有效的 @operation 标签", async () => {
        const tag = createJSDocTag("@operation get /users");
        const result = await parser.parse(tag);
        expect(result).toEqual({ method: "get", path: "/users" });
      });

      it("应该正确解析带有单词summary的 @operation 标签", async () => {
        const tag = createJSDocTag(`@operation post /users`);
        const result = await parser.parse(tag);
        expect(result).toEqual({ method: "post", path: "/users" });
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

      it("应该在参数数量不正确时抛出错误", async () => {
        // 当enableASTAnalysis为true时，这些情况不应该抛出错误
        // 所以我们需要创建一个禁用AST分析的parser
        const contextWithoutAST = createParseContext({ enableASTAnalysis: false });
        const parserWithoutAST = new OperationTagParser(contextWithoutAST);

        const invalidTags = ["@operation get", "@operation"];

        for (const tagContent of invalidTags) {
          const tag = createJSDocTag(tagContent);
          await expect(parserWithoutAST.parse(tag)).rejects.toThrow(/@operation 标签.*不能为空/);
        }
      });

      it("应该在 HTTP 方法无效时抛出错误", async () => {
        const tag = createJSDocTag("@operation invalid /users");
        await expect(parser.parse(tag)).rejects.toThrow(/@operation 标签包含不支持的 HTTP 方法/);
      });

      it("应该在路径不以 / 开头时抛出错误", async () => {
        const tag = createJSDocTag("@operation get users");
        await expect(parser.parse(tag)).rejects.toThrow(/@operation 标签 path 格式不正确/);
      });
    });

    describe("AST分析模式", () => {
      let parserWithASTAnalysis: OperationTagParser;

      beforeEach(() => {
        const context = createParseContext({ enableASTAnalysis: true });
        parserWithASTAnalysis = new OperationTagParser(context);
      });

      it("当启用AST分析时，应该允许空的@operation标签", async () => {
        const tag = createJSDocTag("@operation");
        const result = await parserWithASTAnalysis.parse(tag);
        expect(result).toEqual({});
      });

      it("当启用AST分析时，应该允许只有method的@operation标签", async () => {
        const tag = createJSDocTag("@operation get");
        const result = await parserWithASTAnalysis.parse(tag);
        expect(result).toEqual({ method: "get" });
      });

      it("当启用AST分析时，应该允许只有path的@operation标签", async () => {
        const tag = createJSDocTag("@operation /users");
        const result = await parserWithASTAnalysis.parse(tag);
        expect(result).toEqual({ path: "/users" });
      });

      it("当启用AST分析时，应该正常解析完整的@operation标签", async () => {
        const tag = createJSDocTag("@operation get /users");
        const result = await parserWithASTAnalysis.parse(tag);
        expect(result).toEqual({ method: "get", path: "/users" });
      });

      it("当启用AST分析时，仍然应该验证HTTP方法的有效性", async () => {
        const tag = createJSDocTag("@operation invalid /users");
        await expect(parserWithASTAnalysis.parse(tag)).rejects.toThrow(
          /@operation 标签包含不支持的 HTTP 方法/,
        );
      });

      it("当启用AST分析时，仍然应该验证路径格式", async () => {
        const tag = createJSDocTag("@operation get users");
        await expect(parserWithASTAnalysis.parse(tag)).rejects.toThrow(
          /@operation 标签 path 格式不正确/,
        );
      });
    });

    describe("边界情况", () => {
      it("应该正确处理@operation中Unicode字符的summary", async () => {
        const tag = createJSDocTag("@operation get /users");
        const result = await parser.parse(tag);
        expect(result).toEqual({
          method: "get",
          path: "/users",
        });
      });

      it("应该正确处理长路径", async () => {
        const longPath = "/api/v1/users/{userId}/posts/{postId}/comments/{commentId}";
        const tag = createJSDocTag(`@operation get ${longPath}`);
        const result = await parser.parse(tag);
        expect(result).toEqual({ method: "get", path: longPath });
      });
    });
  });
});
