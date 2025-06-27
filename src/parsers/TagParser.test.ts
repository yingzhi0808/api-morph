import { createJSDocTag, createParseContext, createProject } from "@tests/utils";
import type { JSDocTag, Project } from "ts-morph";
import { SyntaxKind } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import type { SchemaObject } from "@/types/openapi";
import type { OperationData, ParseContext } from "@/types/parser";
import type { ParsedTagParams } from "./TagParser";
import { TagParser } from "./TagParser";

class TestTagParser extends TagParser {
  tags = ["test"];

  parse(_tag: JSDocTag): OperationData {
    return { description: "test parsed data" };
  }

  transformParams(_params: ParsedTagParams, _tag: JSDocTag) {}

  public getTagContentLines(tag: JSDocTag) {
    return this.extractTagContentLines(tag);
  }

  public getTagParamsWithYaml(tag: JSDocTag) {
    return this.parseTagParamsWithYaml(tag);
  }
}

describe("TagParser", () => {
  let parser: TestTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new TestTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["test"]);
    });
  });

  describe("getTags", () => {
    it("getTags 应该返回支持的标签数组", () => {
      const result = parser.getTags();
      expect(result).toEqual(["test"]);
    });
  });

  describe("extractTagContentLines", () => {
    it("应该解析单行标签内容", () => {
      const tag = createJSDocTag("@test 单行内容");
      const result = parser.getTagContentLines(tag);

      expect(result).toEqual(["单行内容"]);
    });

    it("应该解析多行标签内容", () => {
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
    it("应该处理只有内联参数的情况", async () => {
      const tag = createJSDocTag(`@param arg1 arg2 'quoted arg'`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["arg1", "arg2", "quoted arg"],
        yaml: undefined,
        rawText: "arg2 'quoted arg'",
      });
    });

    it("应该处理只有YAML参数的情况", async () => {
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

    it("应该处理内联参数和YAML参数都存在的情况", async () => {
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

    it("应该处理内联参数和YAML参数都为空的情况", async () => {
      const tag = createJSDocTag("@param");
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: [],
        yaml: undefined,
        rawText: "",
      });
    });

    it("应该处理内联参数和YAML参数之间有空行的情况", async () => {
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

    it("应该处理无效的YAML语法", async () => {
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

    it("应该处理包含字符串的 YAML", async () => {
      const tag = createJSDocTag(`@param param
example: "0"
default: "1"`);
      const result = await parser.getTagParamsWithYaml(tag);

      expect(result).toEqual({
        inline: ["param"],
        yaml: {
          example: "0",
          default: "1",
        },
        rawText: 'example: "0"\ndefault: "1"',
      });
    });

    it("应该去除首尾空格", async () => {
      const tag = createJSDocTag(`    @param param
  spaced: value
  other: data    `);
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

    describe("应该处理包含JSDoc链接的标签", () => {
      let project: Project;
      let parser: TestTagParser;
      let context: ParseContext;

      beforeEach(() => {
        project = createProject({
          tsConfigFilePath: "tsconfig.json",
          useInMemoryFileSystem: false,
          skipAddingFilesFromTsConfig: true,
        });
        project.addDirectoryAtPath("tests/fixtures");
        context = createParseContext({}, project);
        parser = new TestTagParser(context);
      });

      it("应该处理JSDoc链接中的 zod schema", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
          `
import { UpdateUserDto } from "@tests/fixtures/schema";
/**
 * @test 测试参数
 * schema: {@link UpdateUserDto}
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.getTagParamsWithYaml(tag);

        expect(result.inline).toEqual(["测试参数"]);
        expect(result.yaml).toEqual({
          schema: { $ref: "#/components/schemas/UpdateUserDto" },
        });
        expect(result.rawText).toEqual(
          `测试参数\nschema: { $ref: "#/components/schemas/UpdateUserDto" }`,
        );
        expect(context.schemas.has("UpdateUserDto")).toBe(true);
      });

      it("应该处理没有标识符的JSDoc链接", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
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

        expect(result.inline).toEqual(["测试参数"]);
        expect(result.yaml).toBeUndefined();
      });

      it("应该处理没有定义节点的JSDoc链接", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
          `
/**
 * @test 测试参数
 * schema: {@link UndefinedType}
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.getTagParamsWithYaml(tag);

        expect(result.inline).toEqual(["测试参数"]);
        expect(result.yaml).toBeUndefined();
        expect(result.rawText).toEqual("测试参数\nschema: {@link UndefinedType}");
      });

      it("应该处理非Zod类型的JSDoc链接", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
          `
export interface NonZodType {
  name: string;
}
/**
 * @test 测试参数
 * schema: {@link NonZodType}
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.getTagParamsWithYaml(tag);

        expect(result.inline).toEqual(["测试参数"]);
        expect(result.yaml).toBeUndefined();
        expect(result.rawText).toEqual("测试参数\nschema: {@link NonZodType}");
      });

      it("应该处理多个JSDoc链接", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
          `
import { UpdateUserDto, UserVo } from "@tests/fixtures/schema";
/**
 * @test 测试参数
 * login: {@link UpdateUserDto}
 * user: {@link UserVo}
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.getTagParamsWithYaml(tag);

        expect(result.inline).toEqual(["测试参数"]);
        expect(result.yaml).toEqual({
          login: { $ref: "#/components/schemas/UpdateUserDto" },
          user: { $ref: "#/components/schemas/UserVo" },
        });
        expect(result.rawText).toEqual(
          `测试参数\nlogin: { $ref: "#/components/schemas/UpdateUserDto" }\nuser: { $ref: "#/components/schemas/UserVo" }`,
        );
        expect(context.schemas.has("UpdateUserDto")).toBe(true);
        expect(context.schemas.has("UserVo")).toBe(true);
      });

      it("应该处理schema已存在于context的情况", async () => {
        const existingSchema: SchemaObject = { type: "object" };
        context.schemas.set("UpdateUserDto", existingSchema);

        const sourceFile = project.createSourceFile(
          "test.ts",
          `
              import { UpdateUserDto } from "@tests/fixtures/schema";
              /**
               * @test 测试参数
               * schema: {@link UpdateUserDto}
               */
              function test() {}
              `,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.getTagParamsWithYaml(tag);

        expect(result.yaml).toEqual({
          schema: { $ref: "#/components/schemas/UpdateUserDto" },
        });
        expect(context.schemas.get("UpdateUserDto")).toBe(existingSchema);
      });

      it("应该处理没有JSDoc链接的情况", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
          `
              /**
               * @test 测试参数
               * type: string
               */
              function test() {}
              `,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.getTagParamsWithYaml(tag);

        expect(result.inline).toEqual(["测试参数"]);
        expect(result.yaml).toEqual({ type: "string" });
        expect(result.rawText).toEqual("测试参数\ntype: string");
      });

      it("应该处理内联参数中的JSDoc链接", async () => {
        const sourceFile = project.createSourceFile(
          "test.ts",
          `
import { UpdateUserDto } from "@tests/fixtures/schema";
/**
 * @test param1 {@link UpdateUserDto} param3
 */
function test() {}`,
        );

        const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
        const result = await parser.getTagParamsWithYaml(tag);

        expect(result.inline).toEqual([
          "param1",
          `$ref: "#/components/schemas/UpdateUserDto"`,
          "param3",
        ]);
        expect(result.yaml).toBeUndefined();
        expect(result.rawText).toEqual(
          `param1 { $ref: "#/components/schemas/UpdateUserDto" } param3`,
        );
        expect(context.schemas.has("UpdateUserDto")).toBe(true);
      });
    });
  });
});
