import { createParseContext } from "@tests/utils";
import type { JSDocTag } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import { TagParser } from "@/core/TagParser";
import type { OperationData } from "@/types";
import { TagParserRegistry } from "./TagParserRegistry";

// 测试用的解析器类
class TestParser1 extends TagParser {
  tags = ["test1", "test2"];

  parse(_tag: JSDocTag): OperationData | null {
    return { description: "test1 data" };
  }
}

class TestParser2 extends TagParser {
  tags = ["test3"];

  parse(_tag: JSDocTag): OperationData | null {
    return { description: "test2 data" };
  }
}

class ConflictParser extends TagParser {
  tags = ["test1"]; // 与 TestParser1 冲突

  parse(_tag: JSDocTag): OperationData | null {
    return { description: "conflict data" };
  }
}

class MultiConflictParser extends TagParser {
  tags = ["test1", "test3"]; // 与多个解析器冲突

  parse(_tag: JSDocTag): OperationData | null {
    return { description: "multi conflict data" };
  }
}

class EmptyTagsParser extends TagParser {
  tags: string[] = [];

  parse(): OperationData | null {
    return null;
  }
}

describe("TagParserRegistry", () => {
  let registry: TagParserRegistry;
  let parser1: TestParser1;
  let parser2: TestParser2;
  const context = createParseContext();

  beforeEach(() => {
    registry = new TagParserRegistry();
    parser1 = new TestParser1(context);
    parser2 = new TestParser2(context);
  });

  describe("register", () => {
    it("应该成功注册单个解析器", () => {
      registry.register(parser1);

      expect(registry.getParser("test1")).toBe(parser1);
      expect(registry.getParser("test2")).toBe(parser1);
    });

    it("应该成功注册多个不冲突的解析器", () => {
      registry.register(parser1);
      registry.register(parser2);

      expect(registry.getParser("test3")).toBe(parser2);
    });

    it("应该在重复注册同一解析器时抛出错误", () => {
      registry.register(parser1);

      expect(() => registry.register(parser1)).toThrow(
        /解析器已存在：解析器实例 "TestParser1" 已经被注册/,
      );
    });

    it("应该在标签冲突时抛出详细错误", () => {
      registry.register(parser1);
      const conflictParser = new ConflictParser(context);

      expect(() => registry.register(conflictParser)).toThrow(
        /标签冲突：解析器 "ConflictParser" 尝试注册的标签与现有解析器冲突。冲突的标签："@test1" \(已被 TestParser1 注册\)/,
      );
    });

    it("应该在多个标签冲突时提供完整的冲突信息", () => {
      registry.register(parser1);
      registry.register(parser2);
      const multiConflictParser = new MultiConflictParser(context);

      expect(() => registry.register(multiConflictParser)).toThrow(
        /标签冲突：解析器 "MultiConflictParser" 尝试注册的标签与现有解析器冲突。冲突的标签："@test1" \(已被 TestParser1 注册\), "@test3" \(已被 TestParser2 注册\)/,
      );
    });

    it("应该拒绝注册空标签数组的解析器", () => {
      const emptyParser = new EmptyTagsParser(context);

      expect(() => registry.register(emptyParser)).toThrow(
        /无效的解析器：解析器 "EmptyTagsParser" 必须至少支持一个标签/,
      );
    });
  });

  describe("查询方法", () => {
    beforeEach(() => {
      registry.register(parser1);
      registry.register(parser2);
    });

    it("getParser 应该返回正确的解析器", () => {
      expect(registry.getParser("test1")).toBe(parser1);
      expect(registry.getParser("test2")).toBe(parser1);
      expect(registry.getParser("test3")).toBe(parser2);
      expect(registry.getParser("nonexistent")).toBeUndefined();
    });

    it("getAllTagNames 应该返回所有标签名", () => {
      const tagNames = registry.getAllTagNames();
      expect(tagNames).toHaveLength(3);
      expect(tagNames).toEqual(expect.arrayContaining(["test1", "test2", "test3"]));
    });
  });

  describe("边界情况", () => {
    it("应该处理相同的解析器类的不同实例", () => {
      const anotherParser1 = new TestParser1(context);

      registry.register(parser1);

      // 不同实例但相同类，应该因为标签冲突而失败
      expect(() => registry.register(anotherParser1)).toThrow(/标签冲突/);
    });
  });
});
