import { createParseContext } from "@tests/utils";
import type { Node } from "ts-morph";
import { describe, expect, it } from "vitest";
import type { OperationData } from "@/types";
import { CodeAnalyzer } from "./CodeAnalyzer";
import { CodeAnalyzerRegistry } from "./CodeAnalyzerRegistry";

class MockCodeAnalyzer extends CodeAnalyzer {
  analyze(_node: Node): OperationData {
    return {
      method: "get",
      path: "/test",
    };
  }
}

class AnotherMockCodeAnalyzer extends CodeAnalyzer {
  analyze(_node: Node): OperationData {
    return {
      method: "post",
      path: "/another",
    };
  }
}

describe("CodeAnalyzerRegistry", () => {
  const context = createParseContext();

  describe("register", () => {
    it("应该成功注册单个分析器", () => {
      const registry = new CodeAnalyzerRegistry();
      const analyzer = new MockCodeAnalyzer(context);

      registry.register(analyzer);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers).toHaveLength(1);
      expect(allAnalyzers[0]).toBe(analyzer);
    });

    it("应该成功注册多个不同的分析器", () => {
      const registry = new CodeAnalyzerRegistry();
      const analyzer1 = new MockCodeAnalyzer(context);
      const analyzer2 = new AnotherMockCodeAnalyzer(context);

      registry.register(analyzer1);
      registry.register(analyzer2);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers).toHaveLength(2);
      expect(allAnalyzers).toContain(analyzer1);
      expect(allAnalyzers).toContain(analyzer2);
    });

    it("当注册重复的分析器时应该抛出错误", () => {
      const registry = new CodeAnalyzerRegistry();
      const analyzer = new MockCodeAnalyzer(context);

      registry.register(analyzer);

      expect(() => {
        registry.register(analyzer);
      }).toThrow('代码分析器名称冲突：分析器 "MockCodeAnalyzer" 已经被注册。');
    });

    it("应该保持注册顺序", () => {
      const registry = new CodeAnalyzerRegistry();
      const analyzer1 = new MockCodeAnalyzer(context);
      const analyzer2 = new AnotherMockCodeAnalyzer(context);
      const analyzer3 = new MockCodeAnalyzer(context);

      registry.register(analyzer1);
      registry.register(analyzer2);
      registry.register(analyzer3);

      const allAnalyzers = registry.getAllAnalyzers();
      expect(allAnalyzers[0]).toBe(analyzer1);
      expect(allAnalyzers[1]).toBe(analyzer2);
      expect(allAnalyzers[2]).toBe(analyzer3);
    });
  });

  describe("getAllAnalyzers", () => {
    it("当没有注册任何分析器时应该返回空数组", () => {
      const registry = new CodeAnalyzerRegistry();
      const allAnalyzers = registry.getAllAnalyzers();

      expect(allAnalyzers).toEqual([]);
      expect(allAnalyzers).toHaveLength(0);
    });

    it("应该返回所有已注册分析器的副本", () => {
      const registry = new CodeAnalyzerRegistry();
      const analyzer1 = new MockCodeAnalyzer(context);
      const analyzer2 = new AnotherMockCodeAnalyzer(context);

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
