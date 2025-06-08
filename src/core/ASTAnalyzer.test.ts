import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import { ASTAnalyzerRegistry } from "@/core";
import type { ParseContext } from "@/types";
import { ExpressRouteAnalyzer, ResponseAnalyzer } from "../analyzers/index";

describe("AST分析器系统", () => {
  let project: Project;
  let context: ParseContext;
  let registry: ASTAnalyzerRegistry;

  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
    });

    context = {
      project,
      typeChecker: project.getTypeChecker(),
      schemas: new Map(),
      options: {
        enableASTAnalysis: true,
        defaultResponseMediaType: "application/json",
        defaultRequestMediaType: "application/json",
      },
    };

    registry = new ASTAnalyzerRegistry();
  });

  describe("ASTAnalyzerRegistry", () => {
    it("应该能够注册分析器", () => {
      const analyzer = new ExpressRouteAnalyzer(context);
      registry.register(analyzer);

      expect(registry.hasAnalyzer("ExpressRoute")).toBe(true);
      expect(registry.size()).toBe(1);
    });

    it("应该防止重复注册同名分析器", () => {
      const analyzer1 = new ExpressRouteAnalyzer(context);
      const analyzer2 = new ExpressRouteAnalyzer(context);

      registry.register(analyzer1);

      expect(() => registry.register(analyzer2)).toThrow("AST分析器名称冲突");
    });

    it("应该按优先级排序分析器", () => {
      const expressAnalyzer = new ExpressRouteAnalyzer(context); // priority: 10
      const responseAnalyzer = new ResponseAnalyzer(context); // priority: 20

      registry.register(responseAnalyzer);
      registry.register(expressAnalyzer);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers[0]).toBe(expressAnalyzer);
      expect(allAnalyzers[1]).toBe(responseAnalyzer);
    });
  });

  describe("ExpressRouteAnalyzer", () => {
    let analyzer: ExpressRouteAnalyzer;

    beforeEach(() => {
      analyzer = new ExpressRouteAnalyzer(context);
    });

    it("应该能够识别Express路由调用", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        app.get("/users", (req, res) => {
          res.json({ users: [] });
        });
        `,
      );

      const expressionStatement = sourceFile.getStatements()[0];
      expect(analyzer.canAnalyze(expressionStatement)).toBe(true);
    });

    it("应该能够解析Express路由信息", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        app.post("/login", (req, res) => {
          res.json({ token: "abc123" });
        });
        `,
      );

      const expressionStatement = sourceFile.getStatements()[0];
      const result = await analyzer.analyze(expressionStatement);

      expect(result).toEqual({
        method: "post",
        path: "/login",
      });
    });

    it("应该处理不以/开头的路径", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        app.get("users", (req, res) => {
          res.json({ users: [] });
        });
        `,
      );

      const expressionStatement = sourceFile.getStatements()[0];
      const result = await analyzer.analyze(expressionStatement);

      expect(result?.path).toBe("/users");
    });
  });

  describe("ResponseAnalyzer", () => {
    let analyzer: ResponseAnalyzer;

    beforeEach(() => {
      analyzer = new ResponseAnalyzer(context);
    });

    it("应该能够识别包含响应的代码", () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        app.get("/test", (req, res) => {
          res.json({ message: "hello" });
        });
        `,
      );

      const expressionStatement = sourceFile.getStatements()[0];
      expect(analyzer.canAnalyze(expressionStatement)).toBe(true);
    });

    it("应该能够解析简单的JSON响应", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        app.get("/test", (req, res) => {
          res.json({ message: "hello", code: 200 });
        });
        `,
      );

      const expressionStatement = sourceFile.getStatements()[0];
      const result = await analyzer.analyze(expressionStatement);

      expect(result?.response?.statusCode).toBe("200");
      expect(result?.response?.response.description).toBe("Response with status 200");
    });

    it("应该能够解析带状态码的响应", async () => {
      const sourceFile = project.createSourceFile(
        "test.ts",
        `
        app.post("/test", (req, res) => {
          res.status(401).json({ error: "Unauthorized" });
        });
        `,
      );

      const expressionStatement = sourceFile.getStatements()[0];
      const result = await analyzer.analyze(expressionStatement);

      expect(result?.response?.statusCode).toBe("401");
    });
  });
});
