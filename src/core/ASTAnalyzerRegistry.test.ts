import { createParseContext } from "@tests/utils";
import type { Node } from "ts-morph";
import { describe, expect, it } from "vitest";
import type { OperationData, ParseContext } from "@/types";
import { ASTAnalyzer } from "./ASTAnalyzer";
import { ASTAnalyzerRegistry } from "./ASTAnalyzerRegistry";

class MockASTAnalyzer extends ASTAnalyzer {
  constructor(
    context: ParseContext,
    public readonly name: string,
  ) {
    super(context);
  }

  analyze(_node: Node): OperationData {
    return {
      method: "get",
      path: "/test",
      summary: `分析器 ${this.name} 的测试`,
    };
  }
}

class AnotherMockASTAnalyzer extends ASTAnalyzer {
  constructor(
    context: ParseContext,
    public readonly name: string,
  ) {
    super(context);
  }

  analyze(_node: Node): OperationData {
    return {
      method: "post",
      path: "/another",
      summary: `另一个分析器 ${this.name} 的测试`,
    };
  }
}

describe("ASTAnalyzerRegistry", () => {
  const context = createParseContext();

  describe("register", () => {
    it("应该成功注册单个分析器", () => {
      const registry = new ASTAnalyzerRegistry();
      const analyzer = new MockASTAnalyzer(context, "test-analyzer");

      registry.register(analyzer);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers).toHaveLength(1);
      expect(allAnalyzers[0]).toBe(analyzer);
      expect(allAnalyzers[0].name).toBe("test-analyzer");
    });

    it("应该成功注册多个不同名称的分析器", () => {
      const registry = new ASTAnalyzerRegistry();
      const analyzer1 = new MockASTAnalyzer(context, "analyzer-1");
      const analyzer2 = new AnotherMockASTAnalyzer(context, "analyzer-2");

      registry.register(analyzer1);
      registry.register(analyzer2);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers).toHaveLength(2);
      expect(allAnalyzers).toContain(analyzer1);
      expect(allAnalyzers).toContain(analyzer2);
    });

    it("当注册重复名称的分析器时应该抛出错误", () => {
      const registry = new ASTAnalyzerRegistry();
      const analyzer1 = new MockASTAnalyzer(context, "duplicate-name");
      const analyzer2 = new AnotherMockASTAnalyzer(context, "duplicate-name");

      registry.register(analyzer1);

      expect(() => {
        registry.register(analyzer2);
      }).toThrow('AST分析器名称冲突：分析器 "duplicate-name" 已经被注册。');
    });

    it("应该保持注册顺序", () => {
      const registry = new ASTAnalyzerRegistry();
      const analyzer1 = new MockASTAnalyzer(context, "first");
      const analyzer2 = new AnotherMockASTAnalyzer(context, "second");
      const analyzer3 = new MockASTAnalyzer(context, "third");

      registry.register(analyzer1);
      registry.register(analyzer2);
      registry.register(analyzer3);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers[0].name).toBe("first");
      expect(allAnalyzers[1].name).toBe("second");
      expect(allAnalyzers[2].name).toBe("third");
    });

    it("应该正确处理具有相同类型但不同名称的分析器", () => {
      const registry = new ASTAnalyzerRegistry();
      const analyzer1 = new MockASTAnalyzer(context, "instance-1");
      const analyzer2 = new MockASTAnalyzer(context, "instance-2");

      registry.register(analyzer1);
      registry.register(analyzer2);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers).toHaveLength(2);
      expect(allAnalyzers[0].name).toBe("instance-1");
      expect(allAnalyzers[1].name).toBe("instance-2");
    });
  });

  describe("getAllAnalyzers", () => {
    it("当没有注册任何分析器时应该返回空数组", () => {
      const registry = new ASTAnalyzerRegistry();
      const allAnalyzers = registry.getAllAnalyzers();

      expect(allAnalyzers).toEqual([]);
      expect(allAnalyzers).toHaveLength(0);
    });

    it("应该返回所有已注册分析器的副本", () => {
      const registry = new ASTAnalyzerRegistry();
      const analyzer1 = new MockASTAnalyzer(context, "analyzer-1");
      const analyzer2 = new AnotherMockASTAnalyzer(context, "analyzer-2");

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
});
