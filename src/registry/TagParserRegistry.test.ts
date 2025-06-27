import { createParseContext } from "@tests/utils";
import type { JSDocTag } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParsedTagParams } from "@/parsers/TagParser";
import { TagParser } from "@/parsers/TagParser";
import type { OperationData } from "@/types/parser";
import { TagParserRegistry } from "./TagParserRegistry";

class TestParser1 extends TagParser {
  tags = ["test1", "test2"];

  parse(_tag: JSDocTag): OperationData {
    return { description: "test1 data" };
  }

  transformParams(_params: ParsedTagParams, _tag: JSDocTag) {}
}

class TestParser2 extends TagParser {
  tags = ["test3"];

  parse(_tag: JSDocTag): OperationData {
    return { description: "test2 data" };
  }

  transformParams(_params: ParsedTagParams, _tag: JSDocTag) {}
}

class ConflictParser extends TagParser {
  tags = ["test1", "test3"];

  parse(_tag: JSDocTag): OperationData {
    return { description: "multi conflict data" };
  }

  transformParams(_params: ParsedTagParams, _tag: JSDocTag) {}
}

class EmptyTagsParser extends TagParser {
  tags: string[] = [];

  parse(_tag: JSDocTag): OperationData {
    return { description: "empty tags data" };
  }

  transformParams(_params: ParsedTagParams, _tag: JSDocTag) {}
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
    it("应该成功注册单个标签解析器", () => {
      registry.register(parser1);

      expect(registry.getParser("test1")).toBe(parser1);
      expect(registry.getParser("test2")).toBe(parser1);
    });

    it("应该成功注册多个标签解析器", () => {
      registry.register(parser1);
      registry.register(parser2);

      expect(registry.getParser("test3")).toBe(parser2);
    });

    it("应该在重复注册同一标签解析器时抛出错误", () => {
      registry.register(parser1);

      expect(() => registry.register(parser1)).toThrow(
        /标签解析器已存在：标签解析器实例 "TestParser1" 已经被注册/,
      );
    });

    it("应该在标签冲突时抛出详细错误", () => {
      registry.register(parser1);
      const conflictParser = new ConflictParser(context);

      expect(() => registry.register(conflictParser)).toThrow(
        /标签冲突：标签解析器 "ConflictParser" 尝试注册的标签与现有标签解析器冲突。冲突的标签："@test1" \(已被 TestParser1 注册\)/,
      );
    });

    it("应该拒绝注册空标签数组的标签解析器", () => {
      const emptyParser = new EmptyTagsParser(context);

      expect(() => registry.register(emptyParser)).toThrow(
        /无效的标签解析器：标签解析器 "EmptyTagsParser" 必须至少支持一个标签/,
      );
    });
  });

  describe("getParser", () => {
    it("getParser 应该返回正确的解析器", () => {
      registry.register(parser1);
      registry.register(parser2);

      expect(registry.getParser("test1")).toBe(parser1);
      expect(registry.getParser("test2")).toBe(parser1);
      expect(registry.getParser("test3")).toBe(parser2);
      expect(registry.getParser("nonexistent")).toBeUndefined();
    });
  });

  describe("getAllTagNames", () => {
    it("getAllTagNames 应该返回所有标签名", () => {
      registry.register(parser1);
      registry.register(parser2);

      const tagNames = registry.getAllTagNames();
      expect(tagNames).toEqual(["test1", "test2", "test3"]);
    });
  });
});
