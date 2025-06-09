import { createJSDocTag, createParseContext } from "@tests/utils";
import type { JSDocTag } from "ts-morph";
import { Project, SyntaxKind } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import { TagParser } from "@/core/TagParser";
import type { OperationData, ParseContext, ParseTagParamsWithYamlOptions } from "@/types";

/**
 * 具体的 TagParser 实现，用于测试抽象类的功能
 */
class TestTagParser extends TagParser {
  tags = ["test"];

  parse(_tag: JSDocTag): OperationData | null {
    return { description: "test parsed data" };
  }

  // 新增 public 方法用于测试
  public getTagContentLines(tag: JSDocTag) {
    return this.extractTagContentLines(tag);
  }

  // 新增 public 方法用于测试
  public getTagParamsWithYaml(tag: JSDocTag, options?: ParseTagParamsWithYamlOptions) {
    return this.parseTagParamsWithYaml(tag, options);
  }
}

describe("TagParser", () => {
  let parser: TestTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new TestTagParser(context);
  });

  describe("extractTagContentLines", () => {
    it("应该解析单行标签内容", () => {
      const tag = createJSDocTag("@test 单行内容");
      const result = parser.getTagContentLines(tag);

      expect(result).toEqual(["单行内容"]);
    });

    it("应该解析多行标签内容并保留格式", () => {
      const tag = createJSDocTag(`@test 第一行
       * 第二行
       * 第三行`);
      const result = parser.getTagContentLines(tag);

      expect(result).toEqual(["第一行", "第二行", "第三行"]);
    });

    it("应该处理带缩进的多行内容", () => {
      const tag = createJSDocTag(`@test 第一行
       *   缩进内容
       *     更深缩进
       * 正常内容`);
      const result = parser.getTagContentLines(tag);

      expect(result).toEqual(["第一行", "  缩进内容", "    更深缩进", "正常内容"]);
    });

    it("应该去掉尾部连续的空行", () => {
      const tag = createJSDocTag(`@test 有效内容
       *
       * `);
      const result = parser.getTagContentLines(tag);

      expect(result).toEqual(["有效内容"]);
    });

    it("应该处理没有内容的标签", () => {
      const tag = createJSDocTag("@test");
      const result = parser.getTagContentLines(tag);

      expect(result).toEqual([]);
    });

    it("应该处理只有空行的标签", () => {
      const tag = createJSDocTag(`@test
       *
       * `);
      const result = parser.getTagContentLines(tag);

      expect(result).toEqual([]);
    });

    it("应该正确处理星号后没有空格的情况", () => {
      const tag = createJSDocTag(`@test 第一行
       *第二行
       *第三行`);
      const result = parser.getTagContentLines(tag);

      expect(result).toEqual(["第一行", "第二行", "第三行"]);
    });

    it("应该处理混合格式的行", () => {
      const tag = createJSDocTag(`@test 第一行
       * 第二行
       *第三行
       *  第四行`);
      const result = parser.getTagContentLines(tag);

      expect(result).toEqual(["第一行", "第二行", "第三行", " 第四行"]);
    });
  });

  describe("parseTagParamsWithYaml", () => {
    it("应该解析纯参数内容", async () => {
      const tag = createJSDocTag(`@param arg1 arg2 'quoted arg'`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["arg1", "arg2", "quoted arg"],
        yaml: undefined,
        rawText: "arg2 'quoted arg'",
      });
    });

    it("应该解析带 YAML 的内容", async () => {
      const tag = createJSDocTag(`@param arg1 arg2
type: object
required: true`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["arg1", "arg2"],
        yaml: {
          type: "object",
          required: true,
        },
        rawText: "arg2\ntype: object\nrequired: true",
      });
    });

    it("应该处理复杂的 YAML 对象", async () => {
      const tag = createJSDocTag(`@param command
schema:
  type: object
  properties:
    name:
      type: string
    age:
      type: number`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["command"],
        yaml: {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
          },
        },
        rawText: "schema:\ntype: object\nproperties:\nname:\ntype: string\nage:\ntype: number",
      });
    });

    it("应该处理第一行参数，剩余行无效 YAML", async () => {
      const tag = createJSDocTag(`@param param
这是描述: 不是YAML
继续描述`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["param"],
        yaml: undefined,
        rawText: "这是描述: 不是YAML\n继续描述",
      });
    });

    it("应该处理第一行参数，剩余行包含引号内容", async () => {
      const tag = createJSDocTag(`@param param
"key: value"
'another: line'`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["param"],
        yaml: undefined,
        rawText: "\"key: value\"\n'another: line'",
      });
    });

    it("应该处理第一行参数，剩余行包含无效 YAML 语法", async () => {
      const tag = createJSDocTag(`@param param
invalid: yaml: syntax:
another: line`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["param"],
        yaml: undefined,
        rawText: "invalid: yaml: syntax:\nanother: line",
      });
    });

    it("应该处理空标签", async () => {
      const tag = createJSDocTag("@param");
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: [],
        yaml: undefined,
        rawText: "",
      });
    });

    it("应该处理只有空行的标签", async () => {
      const tag = createJSDocTag(`@param

        `);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: [],
        yaml: undefined,
        rawText: "",
      });
    });

    it("应该处理第一行为多个参数", async () => {
      const tag = createJSDocTag(`@param arg1 arg2 arg3
type: string`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["arg1", "arg2", "arg3"],
        yaml: {
          type: "string",
        },
        rawText: "arg2 arg3\ntype: string",
      });
    });

    it("应该处理第一行参数，剩余行为有效 YAML", async () => {
      const tag = createJSDocTag(`@param param
type: string
another: yaml`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["param"],
        yaml: {
          type: "string",
          another: "yaml",
        },
        rawText: "type: string\nanother: yaml",
      });
    });

    it("应该处理第一行参数和空行，剩余行为 YAML", async () => {
      const tag = createJSDocTag(`@param arg1

type: string`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["arg1"],
        yaml: {
          type: "string",
        },
        rawText: "type: string",
      });
    });

    it("应该处理包含布尔值的 YAML", async () => {
      const tag = createJSDocTag(`@param param
required: true
deprecated: false`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["param"],
        yaml: {
          required: true,
          deprecated: false,
        },
        rawText: "required: true\ndeprecated: false",
      });
    });

    it("应该处理包含数字的 YAML", async () => {
      const tag = createJSDocTag(`@param param
min: 0
max: 100
default: 50`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["param"],
        yaml: {
          min: 0,
          max: 100,
          default: 50,
        },
        rawText: "min: 0\nmax: 100\ndefault: 50",
      });
    });

    it("应该处理第一行就包含有效 YAML 的情况", async () => {
      const tag = createJSDocTag(`@param
type: string
required: true`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: [],
        yaml: {
          type: "string",
          required: true,
        },
        rawText: ": string\nrequired: true",
      });
    });

    it("应该处理第一行参数，第二行无效 YAML，第三行有效", async () => {
      const tag = createJSDocTag(`@param param
invalid{ yaml
type: string`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["param"],
        yaml: undefined,
        rawText: "invalid{ yaml\ntype: string",
      });
    });

    it("应该正确处理行的 trim 操作", async () => {
      const tag = createJSDocTag(`@param param
  spaced: value
  other: data  `);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["param"],
        yaml: {
          spaced: "value",
          other: "data",
        },
        rawText: "spaced: value\nother: data",
      });
    });

    it("应该处理第一行多个参数，剩余行包含无效 YAML", async () => {
      const tag = createJSDocTag(`@param param arg2
invalid: yaml: bad: syntax
good: value`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["param", "arg2"],
        yaml: undefined,
        rawText: "arg2\ninvalid: yaml: bad: syntax\ngood: value",
      });
    });
  });

  describe("getTags", () => {
    it("getTags 应该返回支持的标签数组", () => {
      const result = parser.getTags();

      expect(result).toEqual(["test"]);
      expect(result).toBe(parser.tags);
    });
  });

  describe("abstract methods and properties", () => {
    it("应该有正确的 tags", () => {
      expect(parser.tags).toEqual(["test"]);
    });

    it("应该能调用 parse 方法", () => {
      const tag = createJSDocTag("@test");
      const result = parser.parse(tag);

      expect(result).toEqual({ description: "test parsed data" });
    });
  });

  describe("preprocessJSDocLinks 错误处理", () => {
    const project = new Project({
      tsConfigFilePath: "tsconfig.json",
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
    });
    let parser: TestTagParser;
    let context: ParseContext;

    beforeEach(() => {
      context = createParseContext({}, project);
      parser = new TestTagParser(context);
    });

    project.addDirectoryAtPath("tests/fixtures");

    it("应该处理JSDoc链接中的 zod schema", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserLoginVo } from "@tests/fixtures/schema";
        /**
         * @test 测试参数
         * schema: {@link UserLoginVo}
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toBeDefined();
      expect(result.inline).toEqual(["测试参数"]);
      expect(result.yaml).toEqual({
        schema: { $ref: "#/components/schemas/UserLoginVo" },
      });
    });

    it("应该处理没有标识符的JSDoc链接", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        /**
         * @test 测试参数
         * schema: {@link}
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toBeDefined();
      expect(result.inline).toEqual(["测试参数"]);
      expect(result.yaml).toBeUndefined();
      expect(result.rawText).includes("@link");
    });

    it("应该处理没有定义节点的JSDoc链接", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        /**
         * @test 测试参数
         * schema: {@link UndefinedType}
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toBeDefined();
      expect(result.inline).toEqual(["测试参数"]);
      expect(result.yaml).toBeUndefined();
      expect(result.rawText).includes("@link UndefinedType");
    });

    it("应该处理非Zod类型的JSDoc链接", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        interface NonZodType {
          name: string;
        }

        /**
         * @test 测试参数
         * schema: {@link NonZodType}
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toBeDefined();
      expect(result.inline).toEqual(["测试参数"]);
      expect(result.yaml).toBeUndefined();
      expect(result.rawText).includes("@link NonZodType");
    });
  });
});
