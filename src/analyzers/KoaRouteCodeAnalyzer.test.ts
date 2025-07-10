import { createParseContext, createProject } from "@tests/utils";
import type { Project } from "ts-morph";
import { SyntaxKind } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParseContext } from "@/types/parser";
import { KoaRouteCodeAnalyzer } from "./KoaRouteCodeAnalyzer";

describe("KoaRouteCodeAnalyzer", () => {
  let project: Project;
  let analyzer: KoaRouteCodeAnalyzer;
  let context: ParseContext;

  beforeEach(() => {
    project = createProject({
      tsConfigFilePath: "tsconfig.json",
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
    });
    context = createParseContext({}, project);
    analyzer = new KoaRouteCodeAnalyzer(context);
  });

  describe("analyze", () => {
    it("应该解析基本的Koa Router路由", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("/users", (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "get",
        path: "/users",
        operationId: "getUsers",
      });
    });

    it("应该处理路径开头没有斜杠的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("users", (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该处理路径结尾带斜杠的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("/users/", (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该处理空字符串路径", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("", (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/");
    });

    it("应该处理路径参数为变量的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        const path = "/users"
        router.get(path, (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该处理路径参数不是字符串类型的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        const path = 123
        router.get(path, (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/");
    });

    it("应该将Koa路径参数转换为OpenAPI格式", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("/users/:id/posts/:postId", (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users/{id}/posts/{postId}");
    });

    it("应该提取属性访问表达式的函数名", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("/users", userController.getUsers)`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsers");
    });

    it("应该提取命名函数表达式的函数名", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("/users", function namedHandler(ctx) {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("namedHandler");
    });

    it("应该提取参数为标识符的函数名", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        function handler() {}
        router.get("/users", handler)`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("handler");
    });

    it("应该为根路径生成正确的operationId", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("/", (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("get");
    });

    it("应该为带参数的路径生成正确的operationId", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("/users/:id", (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsersById");
    });

    it("应该为复杂路径生成正确的operationId", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.post("/api/users/:userId/posts", (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("postApiUsersByUserIdPosts");
    });

    it("应该为多个参数的路径生成正确的operationId", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("/users/:userId/posts/:postId", (ctx) => {})`,
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
        const sourceFile = project.createSourceFile(
          `test-${method}.ts`,
          `
        import { Router } from "@koa/router"
        const router = new Router()
        router.${method}("/users", (ctx) => {})`,
        );
        const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
        const result = await analyzer.analyze(node);

        expect(result.operationId).toBe(expected);
      }
    });

    it("应该使用自定义的operationId生成函数", async () => {
      const context = createParseContext({
        generateOperationId: (method, path) => {
          return `custom_${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`;
        },
      });
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("/users/:id", (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new KoaRouteCodeAnalyzer(context);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("custom_get__users__id_");
    });

    it("应该处理自定义生成器返回null的情况", async () => {
      const context = createParseContext({
        generateOperationId: () => null,
      });
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.get("/users", (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new KoaRouteCodeAnalyzer(context);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBeUndefined();
    });

    it("应该从带中间件的路由中提取处理函数名", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router()
        router.post("/users", middleware1, middleware2, (ctx) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("postUsers");
    });

    it("应该解析带prefix的Koa路由", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router({ prefix: "/api" })
        router.get("/users", (ctx) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "get",
        path: "/api/users",
        operationId: "getApiUsers",
      });
    });

    it("应该处理prefix不是字符串类型的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Router } from "@koa/router"
        const router = new Router({ prefix: 123 })
        router.get("/users", (ctx) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      const result = await analyzer.analyze(node);

      expect(result).toEqual({
        method: "get",
        path: "/users",
        operationId: "getUsers",
      });
    });
  });
});
