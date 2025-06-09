import { createParseContext } from "@tests/utils";
import { Project, SyntaxKind } from "ts-morph";
import { describe, expect, it } from "vitest";
import { ExpressASTAnalyzer } from "./ExpressASTAnalyzer";

describe("ExpressASTAnalyzer", () => {
  const context = createParseContext();
  const analyzer = new ExpressASTAnalyzer(context);

  function createTestNode(code: string) {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile("test.ts", code);
    return sourceFile.getFirstChildByKind(SyntaxKind.ExpressionStatement)!;
  }

  describe("canAnalyze", () => {
    it("应该识别Express路由调用", () => {
      const node = createTestNode('app.get("/users", handler);');
      expect(analyzer.canAnalyze(node)).toBe(true);
    });

    it("应该识别不同的HTTP方法", () => {
      const methods = ["get", "post", "put", "delete", "patch", "options", "head"];

      for (const method of methods) {
        const node = createTestNode(`app.${method}("/test", handler);`);
        expect(analyzer.canAnalyze(node)).toBe(true);
      }
    });

    it("应该拒绝非Express路由调用", () => {
      const node = createTestNode('console.log("test");');
      expect(analyzer.canAnalyze(node)).toBe(false);
    });

    it("应该拒绝不支持的HTTP方法", () => {
      const node = createTestNode('app.invalid("/test", handler);');
      expect(analyzer.canAnalyze(node)).toBe(false);
    });
  });

  describe("analyze", () => {
    it("应该正确解析基本路由", async () => {
      const node = createTestNode('app.get("/users", handler);');
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "get",
        path: "/users",
      });
    });

    it("应该将Express路径参数转换为OpenAPI格式", async () => {
      const testCases = [
        {
          input: 'app.get("/users/:id", handler);',
          expected: { method: "get", path: "/users/{id}" },
        },
        {
          input: 'app.post("/users/:userId/posts/:postId", handler);',
          expected: { method: "post", path: "/users/{userId}/posts/{postId}" },
        },
        {
          input: 'app.put("/api/v1/users/:user_id/settings/:setting_name", handler);',
          expected: { method: "put", path: "/api/v1/users/{user_id}/settings/{setting_name}" },
        },
        {
          input: 'router.delete("/categories/:categoryId/items/:itemId", handler);',
          expected: { method: "delete", path: "/categories/{categoryId}/items/{itemId}" },
        },
      ];

      for (const testCase of testCases) {
        const node = createTestNode(testCase.input);
        const result = await analyzer.analyze(node);
        expect(result).toEqual(testCase.expected);
      }
    });

    it("应该处理混合路径（包含参数和固定路径段）", async () => {
      const node = createTestNode(
        'app.get("/api/users/:id/profile/settings/:settingId", handler);',
      );
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "get",
        path: "/api/users/{id}/profile/settings/{settingId}",
      });
    });

    it("应该为不以/开头的路径添加前缀", async () => {
      const node = createTestNode('app.get("users/:id", handler);');
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "get",
        path: "/users/{id}",
      });
    });

    it("应该处理模板字符串路径", async () => {
      const node = createTestNode("app.get(`/users/:id`, handler);");
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "get",
        path: "/users/{id}",
      });
    });

    it("应该拒绝非字符串路径", async () => {
      const node = createTestNode("app.get(pathVariable, handler);");
      const result = await analyzer.analyze(node);

      expect(result).toBeNull();
    });

    it("应该拒绝参数不足的调用", async () => {
      const node = createTestNode('app.get("/users");');
      const result = await analyzer.analyze(node);

      expect(result).toBeNull();
    });
  });
});
