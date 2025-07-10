import { createParseContext, createProject } from "@tests/utils";
import type { Project } from "ts-morph";
import { SyntaxKind } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParseContext } from "@/types/parser";
import { HonoRouteCodeAnalyzer } from "./HonoRouteCodeAnalyzer";

describe("HonoRouteCodeAnalyzer", () => {
  let project: Project;
  let analyzer: HonoRouteCodeAnalyzer;
  let context: ParseContext;

  beforeEach(() => {
    project = createProject({
      tsConfigFilePath: "tsconfig.json",
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
    });
    context = createParseContext({}, project);
    analyzer = new HonoRouteCodeAnalyzer(context);
  });

  describe("analyze", () => {
    it("应该解析基本的Hono路由", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/users", (c) => {})`,
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

    it("应该处理路径开头没有斜杠的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("users", (c) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该处理路径结尾带斜杠的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/users/", (c) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该处理空字符串路径", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("", (c) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/");
    });

    it("应该处理路径参数为变量的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        const path = "/users"
        app.get(path, (c) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该将Hono路径参数转换为OpenAPI格式", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/users/:id/posts/:postId", (c) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users/{id}/posts/{postId}");
    });

    it("应该提取属性访问表达式的函数名", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/users", userController.getUsers)`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsers");
    });

    it("应该提取命名函数表达式的函数名", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/users", function namedHandler() {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("namedHandler");
    });

    it("应该提取参数为标识符的函数名", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        function handler() {}
        app.get("/users", handler)`,
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
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/", (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("get");
    });

    it("应该为带参数的路径生成正确的operationId", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/users/:id", (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsersById");
    });

    it("应该为复杂路径生成正确的operationId", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.post("/api/users/:userId/posts", (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("postApiUsersByUserIdPosts");
    });

    it("应该为多个参数的路径生成正确的operationId", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/users/:userId/posts/:postId", (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
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
          import { Hono } from "hono"
          const app = new Hono()
          app.${method}("/users", (c) => {})`,
        );
        const node = sourceFile
          .getFirstChildOrThrow()
          .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
        const result = await analyzer.analyze(node);

        expect(result.operationId).toBe(expected);
      }
    });

    it("应该使用自定义的operationId生成函数", async () => {
      const context = createParseContext(
        {
          generateOperationId: (method, path) => {
            return `custom_${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`;
          },
        },
        project,
      );
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/users/:id", (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new HonoRouteCodeAnalyzer(context);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("custom_get__users__id_");
    });

    it("应该处理自定义生成器返回null的情况", async () => {
      const context = createParseContext(
        {
          generateOperationId: () => null,
        },
        project,
      );
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.get("/users", (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new HonoRouteCodeAnalyzer(context);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBeUndefined();
    });

    it("应该从带中间件的路由中提取处理函数名", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        app.post("/users", middleware1, middleware2, (c) => {})`,
      );
      const node = sourceFile
        .getFirstChildOrThrow()
        .getLastChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("postUsers");
    });

    it("应该解析带basePath的Hono路由", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const api = new Hono().basePath("/api")
        api.get("/users", (c) => {})`,
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

    it("应该处理嵌套route的路径拼接", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        const apiRouter = new Hono()
        const userRouter = new Hono()
        app.use("/api", apiRouter)
        apiRouter.use("/users", userRouter)
        userRouter.get("/:id", (c) => {})`,
      );

      const statements = sourceFile.getStatements();
      const lastStatement = statements[statements.length - 1];
      const result = await analyzer.analyze(lastStatement);

      expect(result.path).toBe("/api/users/{id}");
    });

    it("应该处理嵌套route中路径开头没有斜杠的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        const apiRouter = new Hono()
        const userRouter = new Hono()
        app.use("/api", apiRouter)
        apiRouter.use("/users", userRouter)
        userRouter.get("/:id", (c) => {})`,
      );

      const statements = sourceFile.getStatements();
      const lastStatement = statements[statements.length - 1];
      const result = await analyzer.analyze(lastStatement);

      expect(result.path).toBe("/api/users/{id}");
    });

    it("应该处理嵌套route中路径结尾带斜杠的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        const apiRouter = new Hono()
        const userRouter = new Hono()
        app.use("/api/", apiRouter)
        apiRouter.use("/users/", userRouter)
        userRouter.get("/:id/", (c) => {})`,
      );

      const statements = sourceFile.getStatements();
      const lastStatement = statements[statements.length - 1];
      const result = await analyzer.analyze(lastStatement);

      expect(result.path).toBe("/api/users/{id}");
    });

    it("应该处理嵌套route中没有挂载路径的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        const app = new Hono()
        const apiRouter = new Hono()
        const userRouter = new Hono()
        app.use("/api", apiRouter)
        apiRouter.use(userRouter)
        userRouter.get("/users/:id", (c) => {})`,
      );

      const statements = sourceFile.getStatements();
      const lastStatement = statements[statements.length - 1];
      const result = await analyzer.analyze(lastStatement);

      expect(result.path).toBe("/api/users/{id}");
    });

    it("应该处理嵌套route的调用表达式中没有属性访问表达式的情况", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        import { Hono } from "hono"
        import { setupSwaggerUI } from 'api-morph/hono'
        const app = new Hono()
        const apiRouter = new Hono()
        const userRouter = new Hono()
        app.use("/api", apiRouter)
        apiRouter.use("/users", userRouter)
        setupSwaggerUI("/swagger-ui", app)
        userRouter.get("/:id", (c) => {})`,
      );

      const statements = sourceFile.getStatements();
      const lastStatement = statements[statements.length - 1];
      const result = await analyzer.analyze(lastStatement);

      expect(result.path).toBe("/api/users/{id}");
    });
  });
});
