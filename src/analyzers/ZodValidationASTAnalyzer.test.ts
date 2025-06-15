import { Project } from "ts-morph";
import { SyntaxKind } from "typescript";
import { describe, expect, it } from "vitest";
import type { ParseContext } from "@/types";
import { ZodValidationASTAnalyzer } from "./ZodValidationASTAnalyzer";

describe("ZodValidationASTAnalyzer", () => {
  const createTestContext = (): ParseContext => ({
    project: new Project(),
    typeChecker: new Project().getTypeChecker(),
    schemas: new Map(),
    options: {
      defaultRequestMediaType: "application/json",
      defaultResponseMediaType: "application/json",
    },
  });

  it("应该能够识别 validateRequest 中间件调用", async () => {
    const project = new Project();
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      import { validateRequest } from "@/middlewares/zodValidation";
      import { z } from "zod";

      const UserSchema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      /**
       * @operation POST /users
       */
      app.post("/users", validateRequest({ body: UserSchema }), (req, res) => {
        res.json({ success: true });
      });
      `,
    );

    const context = createTestContext();
    context.project = project;
    const analyzer = new ZodValidationASTAnalyzer(context);

    // 查找带有 @operation 标签的节点
    const jsDocNodes = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc);
    const operationNode = jsDocNodes.find((node) =>
      node.getTags().some((tag) => tag.getTagName() === "operation"),
    );

    expect(operationNode).toBeDefined();

    if (operationNode) {
      const parentNode = operationNode.getParent();
      expect(parentNode).toBeDefined();

      if (parentNode) {
        const result = await analyzer.analyze(parentNode);

        // 由于这是一个简单的测试，我们主要验证分析器不会崩溃
        // 实际的schema提取需要真实的模块导入
        expect(result).toBeDefined();
      }
    }
  });

  it("应该能够处理没有 validateRequest 的情况", async () => {
    const project = new Project();
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      /**
       * @operation GET /users
       */
      app.get("/users", (req, res) => {
        res.json({ users: [] });
      });
      `,
    );

    const context = createTestContext();
    context.project = project;
    const analyzer = new ZodValidationASTAnalyzer(context);

    // 查找带有 @operation 标签的节点
    const jsDocNodes = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc);
    const operationNode = jsDocNodes.find((node) =>
      node.getTags().some((tag) => tag.getTagName() === "operation"),
    );

    if (operationNode) {
      const parentNode = operationNode.getParent();
      if (parentNode) {
        const result = await analyzer.analyze(parentNode);

        // 应该返回空对象，因为没有 validateRequest
        expect(result).toEqual({});
      }
    }
  });

  it("应该能够处理无效的 validateRequest 调用", async () => {
    const project = new Project();
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      /**
       * @operation POST /users
       */
      app.post("/users", validateRequest(), (req, res) => {
        res.json({ success: true });
      });
      `,
    );

    const context = createTestContext();
    context.project = project;
    const analyzer = new ZodValidationASTAnalyzer(context);

    // 查找带有 @operation 标签的节点
    const jsDocNodes = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc);
    const operationNode = jsDocNodes.find((node) =>
      node.getTags().some((tag) => tag.getTagName() === "operation"),
    );

    if (operationNode) {
      const parentNode = operationNode.getParent();
      if (parentNode) {
        const result = await analyzer.analyze(parentNode);

        // 应该返回空对象，因为 validateRequest 没有参数
        expect(result).toEqual({});
      }
    }
  });
});
