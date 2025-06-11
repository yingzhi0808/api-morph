import { createParseContext } from "@tests/utils";
import type { Node } from "ts-morph";
import { Project, SyntaxKind } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import type { OperationData } from "@/types";
import { FrameworkAnalyzer } from "./FrameworkAnalyzer";
import { FrameworkAnalyzerRegistry } from "./FrameworkAnalyzerRegistry";

// 测试用的框架分析器类
class TestFrameworkAnalyzer1 extends FrameworkAnalyzer {
  frameworkName = "TestFramework1";

  canAnalyze(node: Node): boolean {
    // 模拟检测逻辑：检查是否包含特定的方法调用
    if (!node.isKind(SyntaxKind.ExpressionStatement)) {
      return false;
    }

    const expression = node.getFirstChildByKind(SyntaxKind.CallExpression);
    if (!expression) {
      return false;
    }

    const propertyAccess = expression.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
    if (!propertyAccess) {
      return false;
    }

    const methodName = propertyAccess.getLastChildByKind(SyntaxKind.Identifier)?.getText();
    return methodName === "testMethod1";
  }

  async analyze(node: Node): Promise<OperationData | null> {
    if (!this.canAnalyze(node)) {
      return null;
    }

    return {
      method: "get",
      path: "/test1",
      description: "TestFramework1 analysis result",
    };
  }
}

class TestFrameworkAnalyzer2 extends FrameworkAnalyzer {
  frameworkName = "TestFramework2";

  canAnalyze(node: Node): boolean {
    if (!node.isKind(SyntaxKind.ExpressionStatement)) {
      return false;
    }

    const expression = node.getFirstChildByKind(SyntaxKind.CallExpression);
    if (!expression) {
      return false;
    }

    const propertyAccess = expression.getFirstChildByKind(SyntaxKind.PropertyAccessExpression);
    if (!propertyAccess) {
      return false;
    }

    const methodName = propertyAccess.getLastChildByKind(SyntaxKind.Identifier)?.getText();
    return methodName === "testMethod2";
  }

  async analyze(node: Node): Promise<OperationData | null> {
    if (!this.canAnalyze(node)) {
      return null;
    }

    return {
      method: "post",
      path: "/test2",
      description: "TestFramework2 analysis result",
    };
  }
}

class ConflictFrameworkAnalyzer extends FrameworkAnalyzer {
  frameworkName = "TestFramework1"; // 与 TestFrameworkAnalyzer1 冲突

  canAnalyze(): boolean {
    return false;
  }

  async analyze(): Promise<OperationData | null> {
    return null;
  }
}

class AlwaysMatchAnalyzer extends FrameworkAnalyzer {
  frameworkName = "AlwaysMatch";

  canAnalyze(): boolean {
    return true; // 总是匹配
  }

  async analyze(): Promise<OperationData | null> {
    return {
      method: "get",
      path: "/always",
      description: "Always match result",
    };
  }
}

describe("FrameworkAnalyzerRegistry", () => {
  let registry: FrameworkAnalyzerRegistry;
  let analyzer1: TestFrameworkAnalyzer1;
  let analyzer2: TestFrameworkAnalyzer2;
  const context = createParseContext();

  function createTestNode(code: string) {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile("test.ts", code);
    return sourceFile.getFirstChildByKind(SyntaxKind.ExpressionStatement)!;
  }

  beforeEach(() => {
    registry = new FrameworkAnalyzerRegistry();
    analyzer1 = new TestFrameworkAnalyzer1(context);
    analyzer2 = new TestFrameworkAnalyzer2(context);
  });

  describe("register", () => {
    it("应该成功注册单个框架分析器", () => {
      registry.register(analyzer1);

      const node = createTestNode("obj.testMethod1();");
      expect(registry.getFirstMatchingAnalyzer(node)).toBe(analyzer1);
    });

    it("应该成功注册多个不冲突的框架分析器", () => {
      registry.register(analyzer1);
      registry.register(analyzer2);

      const node1 = createTestNode("obj.testMethod1();");
      const node2 = createTestNode("obj.testMethod2();");

      expect(registry.getFirstMatchingAnalyzer(node1)).toBe(analyzer1);
      expect(registry.getFirstMatchingAnalyzer(node2)).toBe(analyzer2);
    });

    it("应该在重复注册同一框架名称时抛出错误", () => {
      registry.register(analyzer1);
      const conflictAnalyzer = new ConflictFrameworkAnalyzer(context);

      expect(() => registry.register(conflictAnalyzer)).toThrow(
        '框架分析器名称冲突：框架 "TestFramework1" 已经被注册。',
      );
    });

    it("应该在重复注册同一实例时抛出错误", () => {
      registry.register(analyzer1);

      expect(() => registry.register(analyzer1)).toThrow(
        '框架分析器名称冲突：框架 "TestFramework1" 已经被注册。',
      );
    });
  });

  describe("getFirstMatchingAnalyzer", () => {
    beforeEach(() => {
      registry.register(analyzer1);
      registry.register(analyzer2);
    });

    it("应该返回第一个匹配的分析器", () => {
      const node1 = createTestNode("obj.testMethod1();");
      const node2 = createTestNode("obj.testMethod2();");

      expect(registry.getFirstMatchingAnalyzer(node1)).toBe(analyzer1);
      expect(registry.getFirstMatchingAnalyzer(node2)).toBe(analyzer2);
    });

    it("应该在没有匹配的分析器时返回null", () => {
      const node = createTestNode("obj.unknownMethod();");

      expect(registry.getFirstMatchingAnalyzer(node)).toBeNull();
    });

    it("应该返回第一个匹配的分析器（优先级测试）", () => {
      // 注册一个总是匹配的分析器在第一位
      const alwaysMatch = new AlwaysMatchAnalyzer(context);
      const newRegistry = new FrameworkAnalyzerRegistry();

      newRegistry.register(alwaysMatch); // 先注册总是匹配的
      newRegistry.register(analyzer1); // 后注册特定匹配的

      const node = createTestNode("obj.testMethod1();");

      // 应该返回第一个注册的分析器，即使后面的也匹配
      expect(newRegistry.getFirstMatchingAnalyzer(node)).toBe(alwaysMatch);
    });

    it("应该按注册顺序进行匹配", () => {
      const newRegistry = new FrameworkAnalyzerRegistry();

      // 改变注册顺序
      newRegistry.register(analyzer2); // 先注册analyzer2
      newRegistry.register(analyzer1); // 后注册analyzer1

      const node1 = createTestNode("obj.testMethod1();");
      const node2 = createTestNode("obj.testMethod2();");

      // analyzer1的方法应该仍然被analyzer1处理
      expect(newRegistry.getFirstMatchingAnalyzer(node1)).toBe(analyzer1);
      // analyzer2的方法应该被analyzer2处理
      expect(newRegistry.getFirstMatchingAnalyzer(node2)).toBe(analyzer2);
    });
  });

  describe("getAllAnalyzers", () => {
    it("应该返回空数组当没有注册分析器时", () => {
      expect(registry.getAllAnalyzers()).toEqual([]);
    });

    it("应该返回所有注册的分析器", () => {
      registry.register(analyzer1);
      registry.register(analyzer2);

      const analyzers = registry.getAllAnalyzers();
      expect(analyzers).toHaveLength(2);
      expect(analyzers).toContain(analyzer1);
      expect(analyzers).toContain(analyzer2);
    });

    it("应该按注册顺序返回分析器", () => {
      registry.register(analyzer1);
      registry.register(analyzer2);

      const analyzers = registry.getAllAnalyzers();
      expect(analyzers[0]).toBe(analyzer1);
      expect(analyzers[1]).toBe(analyzer2);
    });
  });

  describe("边界情况", () => {
    it("应该处理相同类型的不同实例", () => {
      const anotherAnalyzer1 = new TestFrameworkAnalyzer1(context);

      registry.register(analyzer1);

      // 不同实例但相同框架名，应该失败
      expect(() => registry.register(anotherAnalyzer1)).toThrow(/框架分析器名称冲突/);
    });

    it("应该正确处理不是ExpressionStatement的节点", () => {
      registry.register(analyzer1);

      const project = new Project({ useInMemoryFileSystem: true });
      const sourceFile = project.createSourceFile("test.ts", "const x = 1;");
      const node = sourceFile.getFirstChildByKind(SyntaxKind.VariableStatement)!;

      expect(registry.getFirstMatchingAnalyzer(node)).toBeNull();
    });

    it("应该正确处理没有方法调用的ExpressionStatement", () => {
      registry.register(analyzer1);

      const node = createTestNode("1 + 1;");

      expect(registry.getFirstMatchingAnalyzer(node)).toBeNull();
    });
  });

  describe("实际使用场景", () => {
    it("应该正确模拟多框架环境", async () => {
      // 模拟一个既有Express又有其他框架的环境
      registry.register(analyzer1); // 模拟Express
      registry.register(analyzer2); // 模拟NestJS

      const expressNode = createTestNode("obj.testMethod1();");
      const nestNode = createTestNode("obj.testMethod2();");
      const unknownNode = createTestNode("obj.unknownMethod();");

      // Express节点应该被Express分析器处理
      const expressAnalyzer = registry.getFirstMatchingAnalyzer(expressNode);
      expect(expressAnalyzer).toBe(analyzer1);

      if (expressAnalyzer) {
        const result = await expressAnalyzer.analyze(expressNode);
        expect(result).toEqual({
          method: "get",
          path: "/test1",
          description: "TestFramework1 analysis result",
        });
      }

      // NestJS节点应该被NestJS分析器处理
      const nestAnalyzer = registry.getFirstMatchingAnalyzer(nestNode);
      expect(nestAnalyzer).toBe(analyzer2);

      if (nestAnalyzer) {
        const result = await nestAnalyzer.analyze(nestNode);
        expect(result).toEqual({
          method: "post",
          path: "/test2",
          description: "TestFramework2 analysis result",
        });
      }

      // 未知节点不应该被任何分析器处理
      expect(registry.getFirstMatchingAnalyzer(unknownNode)).toBeNull();
    });
  });
});
