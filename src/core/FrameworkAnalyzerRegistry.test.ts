import { createParseContext } from "@tests/utils";
import type { Node } from "ts-morph";
import { describe, expect, it } from "vitest";
import type { OperationData, ParseContext } from "@/types";
import { FrameworkAnalyzer } from "./FrameworkAnalyzer";
import { FrameworkAnalyzerRegistry } from "./FrameworkAnalyzerRegistry";

class MockFrameworkAnalyzer extends FrameworkAnalyzer {
  constructor(
    context: ParseContext,
    public readonly frameworkName: string,
    private readonly shouldAnalyze: boolean = true,
  ) {
    super(context);
  }

  canAnalyze(_node: Node): boolean {
    return this.shouldAnalyze;
  }

  analyze(_node: Node): OperationData {
    return {
      method: "get",
      path: "/test",
      summary: `框架 ${this.frameworkName} 的测试`,
    };
  }
}

class AnotherMockFrameworkAnalyzer extends FrameworkAnalyzer {
  constructor(
    context: ParseContext,
    public readonly frameworkName: string,
    private readonly shouldAnalyze: boolean = true,
  ) {
    super(context);
  }

  canAnalyze(_node: Node): boolean {
    return this.shouldAnalyze;
  }

  analyze(_node: Node): OperationData {
    return {
      method: "post",
      path: "/another",
      summary: `另一个框架 ${this.frameworkName} 的测试`,
    };
  }
}

describe("FrameworkAnalyzerRegistry", () => {
  const context = createParseContext();
  const mockNode = {} as Node;

  describe("register", () => {
    it("应该成功注册单个框架分析器", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const analyzer = new MockFrameworkAnalyzer(context, "express");

      registry.register(analyzer);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers).toHaveLength(1);
      expect(allAnalyzers[0]).toBe(analyzer);
      expect(allAnalyzers[0].frameworkName).toBe("express");
    });

    it("应该成功注册多个不同框架的分析器", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const analyzer1 = new MockFrameworkAnalyzer(context, "express");
      const analyzer2 = new AnotherMockFrameworkAnalyzer(context, "fastify");

      registry.register(analyzer1);
      registry.register(analyzer2);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers).toHaveLength(2);
      expect(allAnalyzers).toContain(analyzer1);
      expect(allAnalyzers).toContain(analyzer2);
    });

    it("当注册重复框架名称的分析器时应该抛出错误", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const analyzer1 = new MockFrameworkAnalyzer(context, "express");
      const analyzer2 = new AnotherMockFrameworkAnalyzer(context, "express");

      registry.register(analyzer1);

      expect(() => {
        registry.register(analyzer2);
      }).toThrow('框架分析器名称冲突：框架 "express" 已经被注册。');
    });

    it("应该正确处理具有相同类型但不同框架名称的分析器", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const analyzer1 = new MockFrameworkAnalyzer(context, "framework-1");
      const analyzer2 = new MockFrameworkAnalyzer(context, "framework-2");

      registry.register(analyzer1);
      registry.register(analyzer2);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers).toHaveLength(2);
      expect(allAnalyzers[0].frameworkName).toBe("framework-1");
      expect(allAnalyzers[1].frameworkName).toBe("framework-2");
    });
  });

  describe("getAllAnalyzers", () => {
    it("当没有注册任何分析器时应该返回空数组", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const allAnalyzers = registry.getAllAnalyzers();

      expect(allAnalyzers).toEqual([]);
      expect(allAnalyzers).toHaveLength(0);
    });

    it("应该返回所有已注册分析器的副本", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const analyzer1 = new MockFrameworkAnalyzer(context, "express");
      const analyzer2 = new AnotherMockFrameworkAnalyzer(context, "fastify");

      registry.register(analyzer1);
      registry.register(analyzer2);

      const allAnalyzers1 = registry.getAllAnalyzers();
      const allAnalyzers2 = registry.getAllAnalyzers();

      // 应该返回不同的数组实例
      expect(allAnalyzers1).not.toBe(allAnalyzers2);
      // 但内容应该相同
      expect(allAnalyzers1).toEqual(allAnalyzers2);
      expect(allAnalyzers1).toHaveLength(2);
    });
  });

  describe("getFirstMatchingAnalyzer", () => {
    it("应该返回第一个能够处理节点的分析器", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const analyzer1 = new MockFrameworkAnalyzer(context, "express", true);
      const analyzer2 = new AnotherMockFrameworkAnalyzer(context, "fastify", true);

      registry.register(analyzer1);
      registry.register(analyzer2);

      const matchingAnalyzer = registry.getFirstMatchingAnalyzer(mockNode);
      expect(matchingAnalyzer).toBe(analyzer1);
      expect(matchingAnalyzer?.frameworkName).toBe("express");
    });

    it("应该跳过不能处理节点的分析器", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const analyzer1 = new MockFrameworkAnalyzer(context, "express", false);
      const analyzer2 = new AnotherMockFrameworkAnalyzer(context, "fastify", true);
      const analyzer3 = new MockFrameworkAnalyzer(context, "koa", true);

      registry.register(analyzer1);
      registry.register(analyzer2);
      registry.register(analyzer3);

      const matchingAnalyzer = registry.getFirstMatchingAnalyzer(mockNode);
      expect(matchingAnalyzer).toBe(analyzer2);
      expect(matchingAnalyzer?.frameworkName).toBe("fastify");
    });

    it("当没有分析器能够处理节点时应该返回null", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const analyzer1 = new MockFrameworkAnalyzer(context, "express", false);
      const analyzer2 = new AnotherMockFrameworkAnalyzer(context, "fastify", false);

      registry.register(analyzer1);
      registry.register(analyzer2);

      const matchingAnalyzer = registry.getFirstMatchingAnalyzer(mockNode);
      expect(matchingAnalyzer).toBeNull();
    });

    it("当没有注册任何分析器时应该返回null", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const matchingAnalyzer = registry.getFirstMatchingAnalyzer(mockNode);
      expect(matchingAnalyzer).toBeNull();
    });

    it("应该保持注册顺序进行匹配", () => {
      const registry = new FrameworkAnalyzerRegistry();
      const analyzer1 = new MockFrameworkAnalyzer(context, "first", false);
      const analyzer2 = new AnotherMockFrameworkAnalyzer(context, "second", true);
      const analyzer3 = new MockFrameworkAnalyzer(context, "third", true);

      registry.register(analyzer1);
      registry.register(analyzer2);
      registry.register(analyzer3);

      const matchingAnalyzer = registry.getFirstMatchingAnalyzer(mockNode);
      expect(matchingAnalyzer).toBe(analyzer2);
      expect(matchingAnalyzer?.frameworkName).toBe("second");
    });

    it("应该正确处理同步canAnalyze方法", () => {
      class SyncFrameworkAnalyzer extends FrameworkAnalyzer {
        constructor(
          context: ParseContext,
          public readonly frameworkName: string,
          private readonly shouldAnalyze: boolean = true,
        ) {
          super(context);
        }

        canAnalyze(_node: Node): boolean {
          return this.shouldAnalyze;
        }

        analyze(_node: Node): OperationData {
          return {
            method: "get",
            path: "/sync",
            summary: `同步框架 ${this.frameworkName} 的测试`,
          };
        }
      }

      const registry = new FrameworkAnalyzerRegistry();
      const analyzer = new SyncFrameworkAnalyzer(context, "sync-framework", true);

      registry.register(analyzer);

      const matchingAnalyzer = registry.getFirstMatchingAnalyzer(mockNode);
      expect(matchingAnalyzer).toBe(analyzer);
      expect(matchingAnalyzer?.frameworkName).toBe("sync-framework");
    });
  });
});
