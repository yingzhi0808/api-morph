import { describe, expect, it } from "vitest";
import { removeQuotes, tokenizeString, unescapeString } from "@/utils";

describe("string", () => {
  describe("removeQuotes", () => {
    it("应该移除双引号", () => {
      expect(removeQuotes('"hello world"')).toBe("hello world");
    });

    it("应该移除单引号", () => {
      expect(removeQuotes("'hello world'")).toBe("hello world");
    });

    it("应该处理空引号", () => {
      expect(removeQuotes('""')).toBe("");
      expect(removeQuotes("''")).toBe("");
    });

    it("应该移除引号两端的空格", () => {
      expect(removeQuotes('  "hello world"  ')).toBe("hello world");
      expect(removeQuotes("  'hello world'  ")).toBe("hello world");
    });

    it("应该处理不包含引号的文本", () => {
      expect(removeQuotes("hello world")).toBe("hello world");
    });

    it("应该处理空字符串", () => {
      expect(removeQuotes("")).toBe("");
      expect(removeQuotes("   ")).toBe("");
    });

    it("不应该移除单边引号", () => {
      expect(removeQuotes('"hello world')).toBe('"hello world');
      expect(removeQuotes("'hello world")).toBe("'hello world");
      expect(removeQuotes('hello world"')).toBe('hello world"');
      expect(removeQuotes("hello world'")).toBe("hello world'");
    });

    it("应该处理只有一个字符的引号字符串", () => {
      expect(removeQuotes('"')).toBe('"');
      expect(removeQuotes("'")).toBe("'");
    });

    it("不应该移除不匹配的引号", () => {
      // 使用字符串拼接避免转义问题
      const mixedQuote1 = '"hello world' + "'";
      expect(removeQuotes(mixedQuote1)).toBe(mixedQuote1);

      const mixedQuote2 = "'hello world" + '"';
      expect(removeQuotes(mixedQuote2)).toBe(mixedQuote2);
    });

    it("应该处理嵌套引号", () => {
      // 外层单引号，内层双引号
      const nestedQuote1 = "'" + '"hello"' + "'";
      expect(removeQuotes(nestedQuote1)).toBe('"hello"');

      // 外层双引号，内层单引号
      const nestedQuote2 = '"' + "'hello'" + '"';
      expect(removeQuotes(nestedQuote2)).toBe("'hello'");
    });
  });

  describe("unescapeString", () => {
    it("应该反转义双引号", () => {
      const input = 'hello \\"world\\"';
      const expected = 'hello "world"';
      expect(unescapeString(input)).toBe(expected);
    });

    it("应该反转义单引号", () => {
      const input = "hello \\'world\\'";
      const expected = "hello 'world'";
      expect(unescapeString(input)).toBe(expected);
    });

    it("应该反转义反斜杠", () => {
      expect(unescapeString("hello \\\\world")).toBe("hello \\world");
    });

    it("应该反转义大括号", () => {
      expect(unescapeString("hello \\{world\\}")).toBe("hello {world}");
    });

    it("应该反转义混合转义字符", () => {
      expect(unescapeString('test \\{\\} \\"hello\\" \\\\path')).toBe('test {} "hello" \\path');
    });

    it("不应该修改非转义字符", () => {
      expect(unescapeString("hello world")).toBe("hello world");
    });

    it("应该处理空字符串", () => {
      expect(unescapeString("")).toBe("");
    });

    it("不应该修改单独的反斜杠", () => {
      expect(unescapeString("hello \\ world")).toBe("hello \\ world");
    });

    it("应该处理文本开头和结尾的转义字符", () => {
      expect(unescapeString('\\"hello\\"')).toBe('"hello"');
      expect(unescapeString("\\'hello\\'")).toBe("'hello'");
      expect(unescapeString("\\{hello\\}")).toBe("{hello}");
    });

    it("应该处理不完整的转义序列", () => {
      expect(unescapeString("hello \\world")).toBe("hello \\world");
      expect(unescapeString("test\\")).toBe("test\\");
    });
  });

  describe("tokenizeString", () => {
    it("应该解析简单的空格分隔值", () => {
      expect(tokenizeString("hello world test")).toEqual(["hello", "world", "test"]);
    });

    it("应该解析双引号包裹的值", () => {
      expect(tokenizeString('hello "world test" foo')).toEqual(["hello", "world test", "foo"]);
    });

    it("应该解析单引号包裹的值", () => {
      expect(tokenizeString("hello 'world test' foo")).toEqual(["hello", "world test", "foo"]);
    });

    it("应该处理空行", () => {
      expect(tokenizeString("")).toEqual([]);
      expect(tokenizeString("   ")).toEqual([]);
    });

    it("应该处理只有引号的情况", () => {
      expect(tokenizeString('""')).toEqual([]);
      expect(tokenizeString("''")).toEqual([]);
      expect(tokenizeString("\"\" ''")).toEqual([]);
    });

    it("应该处理单个值", () => {
      expect(tokenizeString("hello")).toEqual(["hello"]);
      expect(tokenizeString('"hello"')).toEqual(["hello"]);
      expect(tokenizeString("'hello'")).toEqual(["hello"]);
    });

    it("应该处理转义字符", () => {
      expect(tokenizeString('hello "world \\"test\\"" foo')).toEqual([
        "hello",
        'world "test"',
        "foo",
      ]);
    });

    it("应该处理单引号中的转义字符", () => {
      expect(tokenizeString("hello 'world \\'test\\'' foo")).toEqual([
        "hello",
        "world 'test'",
        "foo",
      ]);
    });

    it("应该处理多个连续空格", () => {
      expect(tokenizeString("hello    world     test")).toEqual(["hello", "world", "test"]);
    });

    it("应该处理行首行尾的空格", () => {
      expect(tokenizeString("  hello world  ")).toEqual(["hello", "world"]);
    });

    it("应该处理包含空格的引号值", () => {
      const input = '"   hello   " ' + "'   world   '";
      expect(tokenizeString(input)).toEqual(["hello", "world"]);
    });

    it("应该处理复杂的转义序列", () => {
      expect(tokenizeString('"path\\\\to\\\\file.txt"')).toEqual(["path\\to\\file.txt"]);
    });

    it("应该处理不完整的引号", () => {
      // 不完整的引号会被正则表达式匹配为普通字符，但引号会被移除
      expect(tokenizeString('hello "world')).toEqual(["hello", "world"]);
      expect(tokenizeString("hello 'world")).toEqual(["hello", "world"]);
    });

    it("应该正确处理空值", () => {
      expect(tokenizeString('hello "" world')).toEqual(["hello", "world"]);
      expect(tokenizeString("hello '' world")).toEqual(["hello", "world"]);
    });

    it("应该处理制表符和其他空白字符", () => {
      expect(tokenizeString("hello\tworld\ntest")).toEqual(["hello", "world", "test"]);
    });

    it("应该处理混合引号", () => {
      const input = 'hello "world test" ' + "'foo bar'" + " baz";
      expect(tokenizeString(input)).toEqual(["hello", "world test", "foo bar", "baz"]);
    });

    it("应该处理复杂的嵌套引号", () => {
      expect(tokenizeString('command "arg with \\"nested\\" quotes" simple')).toEqual([
        "command",
        'arg with "nested" quotes',
        "simple",
      ]);
    });

    it("应该处理引号内的特殊字符", () => {
      const input = '"hello@world.com" ' + "'path/to/file'";
      expect(tokenizeString(input)).toEqual(["hello@world.com", "path/to/file"]);
    });

    it("应该处理包含引号字符的值", () => {
      expect(tokenizeString('test "value with \' quote" end')).toEqual([
        "test",
        "value with ' quote",
        "end",
      ]);
    });

    it("应该处理正则表达式边界情况", () => {
      // 测试正则表达式匹配机制
      expect(tokenizeString("a b c")).toEqual(["a", "b", "c"]);
      expect(tokenizeString('"a" "b" "c"')).toEqual(["a", "b", "c"]);
      expect(tokenizeString("'a' 'b' 'c'")).toEqual(["a", "b", "c"]);
    });

    it("应该处理多层转义", () => {
      expect(tokenizeString('"test\\\\value"')).toEqual(["test\\value"]);
    });

    it("应该解析大括号包裹的值", () => {
      expect(tokenizeString("hello {world test} foo")).toEqual(["hello", "world test", "foo"]);
    });

    it("应该处理只有大括号的情况", () => {
      expect(tokenizeString("{}")).toEqual([]);
      expect(tokenizeString("{} ''")).toEqual([]);
    });

    it("应该处理大括号中的转义字符", () => {
      expect(tokenizeString("hello {world \\{test\\}} foo")).toEqual([
        "hello",
        "world {test}",
        "foo",
      ]);
    });

    it("应该处理包含空格的大括号值", () => {
      expect(tokenizeString("{   hello   } world")).toEqual(["hello", "world"]);
    });

    it("应该处理混合引号和大括号", () => {
      const input = "hello \"world test\" {foo bar} 'baz qux'";
      expect(tokenizeString(input)).toEqual(["hello", "world test", "foo bar", "baz qux"]);
    });

    it("应该处理大括号内的引号", () => {
      expect(tokenizeString('{hello "world" test}')).toEqual(['hello "world" test']);
    });

    it("应该处理引号内的大括号", () => {
      expect(tokenizeString('"hello {world} test"')).toEqual(["hello {world} test"]);
    });

    it("应该处理嵌套转义大括号", () => {
      expect(tokenizeString("command {arg with \\{nested\\} braces} simple")).toEqual([
        "command",
        "arg with {nested} braces",
        "simple",
      ]);
    });

    it("应该处理不完整的大括号", () => {
      // 不完整的大括号会被正则表达式匹配为普通字符
      expect(tokenizeString("hello {world")).toEqual(["hello", "{world"]);
      expect(tokenizeString("hello world}")).toEqual(["hello", "world}"]);
    });

    it("应该处理空的大括号值", () => {
      expect(tokenizeString("hello {} world")).toEqual(["hello", "world"]);
    });

    it("应该处理大括号内的特殊字符", () => {
      expect(tokenizeString("{@link UserVo} description")).toEqual(["@link UserVo", "description"]);
    });

    it("应该处理复杂的大括号表达式", () => {
      expect(tokenizeString("type {Array<string>} description")).toEqual([
        "type",
        "Array<string>",
        "description",
      ]);
    });
  });
});
