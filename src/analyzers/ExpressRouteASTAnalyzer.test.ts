import { createParseContext } from "@tests/utils";
import { SyntaxKind } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParseContext } from "@/types";
import { ExpressRouteASTAnalyzer } from "./ExpressRouteASTAnalyzer";

describe("ExpressRouteASTAnalyzer", () => {
  let analyzer: ExpressRouteASTAnalyzer;
  let context: ParseContext;

  beforeEach(() => {
    context = createParseContext();
    analyzer = new ExpressRouteASTAnalyzer(context);
  });

  describe("analyze", () => {
    it("应该解析基本的express路由", async () => {
      const sourceFile = context.project.createSourceFile("test.ts", 'app.get("/users", handler);');
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "get",
        path: "/users",
        operationId: "handler",
      });
    });

    it("应该将Express路径参数转换为OpenAPI格式", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users/:id/posts/:postId", handler);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users/{id}/posts/{postId}");
    });

    it("应该为没有斜杠开头的路径添加斜杠", async () => {
      const sourceFile = context.project.createSourceFile("test.ts", 'app.get("users", handler);');
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该处理空字符串路径", async () => {
      const sourceFile = context.project.createSourceFile("test.ts", 'app.get("", () => {});');
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      // 空字符串路径应该被转换为"/"
      expect(result.path).toBe("/");
      expect(result.operationId).toBe("get");
    });

    it("应该处理模板字符串路径", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        "app.get(`/users/:id`, handler);",
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users/{id}");
    });

    it("应该提取属性访问表达式的函数名", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users", userController.getUsers);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsers");
    });

    it("应该提取命名函数表达式的函数名", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users", function namedHandler() {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("namedHandler");
    });

    it("应该为根路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile("test.ts", 'app.get("/", () => {});');
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("get");
    });

    it("应该为带参数的路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users/:id", () => {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsersById");
    });

    it("应该为复杂路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.post("/api/v1/users/:userId/posts", () => {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("postApiV1UsersByUserIdPosts");
    });

    it("应该为多个参数的路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users/:userId/posts/:postId", () => {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsersByUserIdPostsByPostId");
    });

    it("应该处理不同HTTP方法的operationId", async () => {
      const methods = [
        { method: "get", expected: "getUsers" },
        { method: "post", expected: "postUsers" },
        { method: "put", expected: "putUsers" },
        { method: "patch", expected: "patchUsers" },
        { method: "delete", expected: "deleteUsers" },
      ];

      for (const { method, expected } of methods) {
        const sourceFile = context.project.createSourceFile(
          `test-${method}.ts`,
          `app.${method}("/users", () => {});`,
        );
        const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
        const result = await analyzer.analyze(node);

        expect(result.operationId).toBe(expected);
      }
    });

    it("应该使用自定义的operationId生成函数", async () => {
      const customContext = createParseContext({
        generateOperationId: (method, path) => {
          return `custom_${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`;
        },
      });
      const customAnalyzer = new ExpressRouteASTAnalyzer(customContext);
      const sourceFile = customContext.project.createSourceFile(
        "test.ts",
        'app.get("/users/:id", handler);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await customAnalyzer.analyze(node);

      expect(result.operationId).toBe("custom_get__users__id_");
    });

    it("应该处理自定义生成器返回null的情况", async () => {
      const customContext = createParseContext({
        generateOperationId: () => null,
      });
      const customAnalyzer = new ExpressRouteASTAnalyzer(customContext);
      const sourceFile = customContext.project.createSourceFile(
        "test.ts",
        'app.get("/users", handler);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await customAnalyzer.analyze(node);

      expect(result.operationId).toBeUndefined();
    });

    it("应该向自定义生成器传递正确的参数", async () => {
      let capturedArgs: Parameters<NonNullable<ParseContext["options"]["generateOperationId"]>> = [
        "get",
        "",
        "",
        undefined,
      ];
      const customContext = createParseContext({
        generateOperationId: (...args) => {
          capturedArgs = args;
          return "custom";
        },
      });
      const customAnalyzer = new ExpressRouteASTAnalyzer(customContext);
      const sourceFile = customContext.project.createSourceFile(
        "users.ts",
        'app.get("/users/:id", getUserById);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      await customAnalyzer.analyze(node);

      expect(capturedArgs).toEqual([
        "get", // method
        "/users/{id}", // path
        "users", // fileName
        "getUserById", // functionName
      ]);
    });

    it("应该从带中间件的路由中提取处理函数名", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.post("/users", validateUser, createUser);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("createUser");
    });
  });
});
