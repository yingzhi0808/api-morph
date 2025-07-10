import { createParseContext } from "@tests/utils";
import { SyntaxKind } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParseContext } from "@/types/parser";
import { ExpressRouteCodeAnalyzer } from "./ExpressRouteCodeAnalyzer";

describe("ExpressRouteCodeAnalyzer", () => {
  let analyzer: ExpressRouteCodeAnalyzer;
  let context: ParseContext;

  beforeEach(() => {
    context = createParseContext();
    analyzer = new ExpressRouteCodeAnalyzer(context);
  });

  describe("analyze", () => {
    it("应该解析基本的express路由", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users", (req, res) => {})',
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
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("users", (req, res) => {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该处理路径结尾带斜杠的情况", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users/", (req, res) => {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该处理空字符串路径", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("", (req, res) => {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/");
    });

    it("应该处理路径参数为变量的情况", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        const path = "/users"
        app.get(path, (req, res) => {})`,
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users");
    });

    it("应该将Express路径参数转换为OpenAPI格式", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users/:id/posts/:postId", (req, res) => {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.path).toBe("/users/{id}/posts/{postId}");
    });

    it("应该提取属性访问表达式的函数名", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users", userController.getUsers)',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsers");
    });

    it("应该提取命名函数表达式的函数名", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users", function namedHandler() {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("namedHandler");
    });

    it("应该提取参数为标识符的函数名", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
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
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/", (req, res) => {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("get");
    });

    it("应该为带参数的路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users/:id", (req, res) => {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);

      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("getUsersById");
    });

    it("应该为复杂路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.post("/api/users/:userId/posts", (req, res) => {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("postApiUsersByUserIdPosts");
    });

    it("应该为多个参数的路径生成正确的operationId", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users/:userId/posts/:postId", (req, res) => {})',
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
          `app.${method}("/users", (req, res) => {})`,
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
        'app.get("/users/:id", (req, res) => {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new ExpressRouteCodeAnalyzer(context);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("custom_get__users__id_");
    });

    it("应该处理自定义生成器返回null的情况", async () => {
      const context = createParseContext({
        generateOperationId: () => null,
      });
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.get("/users", (req, res) => {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const analyzer = new ExpressRouteCodeAnalyzer(context);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBeUndefined();
    });

    it("应该从带中间件的路由中提取处理函数名", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        'app.post("/users", middleware1, middleware2, (req, res) => {})',
      );
      const node = sourceFile.getFirstChildByKindOrThrow(SyntaxKind.ExpressionStatement);
      const result = await analyzer.analyze(node);

      expect(result.operationId).toBe("postUsers");
    });

    it("应该处理嵌套route的路径拼接", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        import express from 'express'
        const app = express()
        const apiRouter = express.Router()
        const userRouter = express.Router()
        app.use('/api', apiRouter)
        apiRouter.use('/users', userRouter)
        userRouter.get('/:id', (req, res) => {})`,
      );

      const statements = sourceFile.getStatements();
      const lastStatement = statements[statements.length - 1];
      const result = await analyzer.analyze(lastStatement);

      expect(result.path).toBe("/api/users/{id}");
    });

    it("应该处理嵌套route中路径开头没有斜杠的情况", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        import express from 'express'
        const app = express()
        const apiRouter = express.Router()
        const userRouter = express.Router()
        app.use('api', apiRouter)
        apiRouter.use('users', userRouter)
        userRouter.get(':id', (req, res) => {})`,
      );

      const statements = sourceFile.getStatements();
      const lastStatement = statements[statements.length - 1];
      const result = await analyzer.analyze(lastStatement);

      expect(result.path).toBe("/api/users/{id}");
    });

    it("应该处理嵌套route中路径结尾带斜杠的情况", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        import express from 'express'
        const app = express()
        const apiRouter = express.Router()
        const userRouter = express.Router()
        app.use("/api/", apiRouter)
        apiRouter.use("/users/", userRouter)
        userRouter.get("/:id/", (req, res) => {})`,
      );

      const statements = sourceFile.getStatements();
      const lastStatement = statements[statements.length - 1];
      const result = await analyzer.analyze(lastStatement);

      expect(result.path).toBe("/api/users/{id}");
    });

    it("应该处理嵌套route中没有挂载路径的情况", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        import express from 'express'
        import { setupSwaggerUI } from 'api-morph/express'
        const app = express()
        const apiRouter = express.Router()
        const userRouter = express.Router()
        app.use("/api", apiRouter)
        apiRouter.use(userRouter)
        userRouter.get("/users/:id", (req, res) => {})`,
      );

      const statements = sourceFile.getStatements();
      const lastStatement = statements[statements.length - 1];
      const result = await analyzer.analyze(lastStatement);

      expect(result.path).toBe("/api/users/{id}");
    });

    it("应该处理嵌套route的调用表达式中没有属性访问表达式的情况", async () => {
      const sourceFile = context.project.createSourceFile(
        "test.ts",
        `
        import express from 'express'
        const app = express()
        const apiRouter = express.Router()
        const userRouter = express.Router()
        app.use("/api", apiRouter)
        apiRouter.use("/users", userRouter)
        setupSwaggerUI("/swagger-ui", app)
        userRouter.get("/:id", (req, res) => {})`,
      );

      const statements = sourceFile.getStatements();
      const lastStatement = statements[statements.length - 1];
      const result = await analyzer.analyze(lastStatement);

      expect(result.path).toBe("/api/users/{id}");
    });
  });
});
