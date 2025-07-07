import { createParseContext } from "@tests/utils";
import { SyntaxKind } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParseContext } from "@/types/parser";
import { KoaRouteCodeAnalyzer } from "./KoaRouteCodeAnalyzer";

describe("KoaRouteCodeAnalyzer", () => {
  let analyzer: KoaRouteCodeAnalyzer;
  let context: ParseContext;

  beforeEach(() => {
    context = createParseContext();
    analyzer = new KoaRouteCodeAnalyzer(context);
  });

  describe("analyze", () => {
    it("应该解析基本的Koa Router路由", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("/users", handler);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "get",
        path: "/users",
        operationId: "handler",
      });
    });

    it("应该将Koa路径参数转换为OpenAPI格式", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("/users/:id/posts/:postId", handler);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users/{id}/posts/{postId}");
    });

    it("应该为没有斜杠开头的路径添加斜杠", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("users", handler);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该处理空字符串路径", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("", async (ctx, next) => {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      // 空字符串路径应该被转换为"/"
      expect(result.path).toBe("/");
      expect(result.operationId).toBe("get");
    });

    it("应该处理模板字符串路径", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        "router.get(`/users/:id`, handler);",
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users/{id}");
    });

    it("应该提取属性访问表达式的函数名", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("/users", userController.getUsers);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsers");
    });

    it("应该提取命名函数表达式的函数名", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("/users", async function namedHandler(ctx, next) {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("namedHandler");
    });

    it("应该处理箭头函数处理器", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("/users", async (ctx, next) => {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsers");
    });

    it("应该为根路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("/", async (ctx, next) => {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("get");
    });

    it("应该为带参数的路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("/users/:id", async (ctx, next) => {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsersById");
    });

    it("应该为复杂路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.post("/api/users/:userId/posts", async (ctx, next) => {});',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("postApiUsersByUserIdPosts");
    });

    it("应该为多个参数的路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("/users/:userId/posts/:postId", async (ctx, next) => {});',
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
          `router.${method}("/users", async (ctx, next) => {});`,
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
      const customAnalyzer = new KoaRouteCodeAnalyzer(customContext);
      const sourceFile = customContext.project.createSourceFile(
        "test.ts",
        'router.get("/users/:id", handler);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await customAnalyzer.analyze(node);

      expect(result.operationId).toBe("custom_get__users__id_");
    });

    it("应该处理自定义生成器返回null的情况", async () => {
      const customContext = createParseContext({
        generateOperationId: () => null,
      });
      const customAnalyzer = new KoaRouteCodeAnalyzer(customContext);
      const sourceFile = customContext.project.createSourceFile(
        "test.ts",
        'router.get("/users", handler);',
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
      const customAnalyzer = new KoaRouteCodeAnalyzer(customContext);
      const sourceFile = customContext.project.createSourceFile(
        "api.ts",
        'router.get("/users", namedHandler);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      await customAnalyzer.analyze(node);

      expect(capturedArgs).toEqual([
        "get", // method
        "/users", // path
        "api", // fileName
        "namedHandler", // functionName
      ]);
    });

    it("应该从带中间件的路由中提取处理函数名", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("/users", middleware1, middleware2, handler);',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("handler");
    });

    it("应该处理匿名箭头函数", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'router.get("/users/:id", middleware, async (ctx) => { return ctx.body = "test"; });',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      // 箭头函数没有名称，应该使用生成的operationId
      expect(result.operationId).toBe("getUsersById");
    });
  });

  it("应该正确处理基本的路由前缀", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          const router = new Router({ prefix: "/api" });
          router.get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/api/users");
  });

  it("应该处理前缀和路径都带斜杠的情况", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          const router = new Router({ prefix: "/api/" });
          router.get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/api//users");
  });

  it("应该处理空字符串前缀", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          const router = new Router({ prefix: "" });
          router.get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/users");
  });

  it("应该处理前缀为中模板字符串的情况", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          const router = new Router({ prefix: \`/api\` });
          router.get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/api/users");
  });

  it("应该处理作为标识符引用的前缀", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          const apiPrefix = "/api";
          const router = new Router({ prefix: apiPrefix });
          router.get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/api/users");
  });

  it("应该处理作为标识符引用的模板字符串前缀", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          const apiPrefix = \`/api\`;
          const router = new Router({ prefix: apiPrefix });
          router.get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/api/users");
  });

  it("should handle prefix value being a call expression", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          function getPrefix() { return "/api"; }
          const router = new Router({ prefix: getPrefix() });
          router.get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/users");
  });

  it("should handle router being a call expression", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          function getRouter() { return new Router({ prefix: "/api" }); }
          getRouter().get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/users");
  });

  it("should handle router variable not initialized with new expression", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          const routerFactory = { create: () => new Router({ prefix: "/api" }) };
          const router = routerFactory.create();
          router.get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/users");
  });

  it("should handle router options without prefix property", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          const router = new Router({ methods: ['get'] });
          router.get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/users");
  });

  it("should handle uninitialized prefix identifier", async () => {
    const sourceFile = context.project.createSourceFile(
      "test.ts",
      `
          import Router from "@koa/router";
          let apiPrefix: string;
          const router = new Router({ prefix: apiPrefix });
          router.get("/users", handler);
        `,
    );
    const node = sourceFile.getStatementByKindOrThrow(SyntaxKind.ExpressionStatement);
    const result = await analyzer.analyze(node);
    expect(result.path).toBe("/users");
  });
});
