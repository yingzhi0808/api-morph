import { createJSDocTag, createParseContext } from "@tests/utils";
import { Project, SyntaxKind } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";
import { JSDocTagName } from "@/constants";
import type { ParseContext } from "@/types";
import { RequestBodyTagParser } from "./RequestBodyTagParser";

describe("RequestBodyTagParser", () => {
  let parser: RequestBodyTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new RequestBodyTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual([JSDocTagName.REQUEST_BODY]);
    });
  });

  describe("简化语法", () => {
    const project = new Project({
      tsConfigFilePath: "tsconfig.json",
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
    });
    let context: ParseContext;

    beforeEach(() => {
      context = createParseContext(project);
      parser = new RequestBodyTagParser(context);
    });

    project.addDirectoryAtPath("tests/fixtures");

    it("应该正确解析简化语法：mediaType + schema + description", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @requestBody application/json {@link UserVo} 用户注册信息
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户注册信息",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserVo",
              },
            },
          },
        },
      });
    });

    it("应该正确解析简化语法：只有 mediaType + schema", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @requestBody application/json {@link UserVo}
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserVo",
              },
            },
          },
        },
      });
    });

    it("应该在省略 mediaType 时使用默认请求体媒体类型", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @requestBody {@link UserVo} 用户注册信息
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户注册信息",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserVo",
              },
            },
          },
        },
      });
    });

    it("应该在省略 mediaType 时使用默认请求体媒体类型（只有 schema）", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @requestBody {@link UserVo}
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserVo",
              },
            },
          },
        },
      });
    });

    it("应该支持 media type 简写功能", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @requestBody json {@link UserVo} 用户注册信息
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户注册信息",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserVo",
              },
            },
          },
        },
      });
    });

    it("应该正确处理复杂的 media type 与 JSDoc 链接", async () => {
      const sourceFile = project.createSourceFile(
        `test-${Date.now()}.ts`,
        `
        import { UserVo } from "@tests/fixtures/schema";
        /**
         * @requestBody application/vnd.api+json {@link UserVo} API请求数据
         */
        function test() {}
        `,
      );

      const tag = sourceFile.getFirstDescendantByKindOrThrow(SyntaxKind.JSDocTag);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "API请求数据",
          content: {
            "application/vnd.api+json": {
              schema: {
                $ref: "#/components/schemas/UserVo",
              },
            },
          },
        },
      });
    });

    it("应该正确处理只有 mediaType 和描述的语法", async () => {
      const tag = createJSDocTag("@requestBody application/json 用户信息");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户信息",
          content: {
            "application/json": {},
          },
        },
      });
    });

    it("应该正确处理 mediaType 简写和描述的语法", async () => {
      const tag = createJSDocTag("@requestBody json 用户数据");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        requestBody: {
          description: "用户数据",
          content: {
            "application/json": {},
          },
        },
      });
    });

    it("应该在无效的简化语法时回退到原始语法验证", async () => {
      const tag = createJSDocTag("@requestBody 这只是描述");
      await expect(parser.parse(tag)).rejects.toThrow(/@requestBody 标签必须包含 YAML 参数/);
    });
  });

  describe("parse", () => {
    it("应该正确解析带描述的请求体标签", async () => {
      const tag = createJSDocTag(`@requestBody 用户注册信息
       required: true
       content:
         application/json:
           schema:
             type: object
             properties:
               name:
                 type: string
               email:
                 type: string`);

      const result = await parser.parse(tag);
      expect(result).toHaveProperty("requestBody");
      expect(result?.requestBody?.description).toBe("用户注册信息");
      expect(result?.requestBody?.required).toBe(true);
      expect(result?.requestBody?.content).toHaveProperty("application/json");
      expect(result?.requestBody?.content?.["application/json"]?.schema).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
      });
    });

    it("应该正确解析不带描述的请求体标签", async () => {
      const tag = createJSDocTag(`@requestBody
       required: false
       content:
         application/json:
           schema:
             $ref: '#/components/schemas/User'`);

      const result = await parser.parse(tag);
      expect(result).toHaveProperty("requestBody");
      expect(result?.requestBody?.description).toBeUndefined();
      expect(result?.requestBody?.required).toBe(false);
      expect(result?.requestBody?.content).toHaveProperty("application/json");
      expect(result?.requestBody?.content?.["application/json"]?.schema).toEqual({
        $ref: "#/components/schemas/User",
      });
    });

    it("应该正确处理多个内容类型", async () => {
      const tag = createJSDocTag(`@requestBody 文件上传
       required: true
       content:
         application/json:
           schema:
             type: object
         application/xml:
           schema:
             type: object
         multipart/form-data:
           schema:
             type: object
             properties:
               file:
                 type: string
                 format: binary`);

      const result = await parser.parse(tag);
      const requestBody = result?.requestBody;

      expect(requestBody?.description).toBe("文件上传");
      expect(requestBody?.required).toBe(true);
      expect(requestBody?.content).toHaveProperty("application/json");
      expect(requestBody?.content).toHaveProperty("application/xml");
      expect(requestBody?.content).toHaveProperty("multipart/form-data");
      expect(requestBody?.content?.["multipart/form-data"]?.schema).toEqual({
        type: "object",
        properties: {
          file: { type: "string", format: "binary" },
        },
      });
    });

    it("应该正确处理扩展字段", async () => {
      const tag = createJSDocTag(`@requestBody API数据
       required: true
       content:
         application/json:
           schema:
             type: object
       x-custom-field: custom-value
       x-validation-rules: strict`);

      const result = await parser.parse(tag);
      const requestBody = result?.requestBody;

      expect(requestBody).toHaveProperty("x-custom-field", "custom-value");
      expect(requestBody).toHaveProperty("x-validation-rules", "strict");
    });

    it("应该正确处理YAML中覆盖描述的情况", async () => {
      const tag = createJSDocTag(`@requestBody 原始描述
       description: YAML中的新描述
       required: true
       content:
         application/json:
           schema:
             type: object`);

      const result = await parser.parse(tag);
      expect(result?.requestBody?.description).toBe("YAML中的新描述");
    });

    it("应该正确处理复杂的multipart配置", async () => {
      const tag = createJSDocTag(`@requestBody 文件上传请求
       required: true
       content:
         multipart/form-data:
           schema:
             type: object
             properties:
               file:
                 type: string
                 format: binary
               metadata:
                 type: object
                 properties:
                   name:
                     type: string
                   size:
                     type: integer
           encoding:
             file:
               contentType: image/*
             metadata:
               contentType: application/json`);

      const result = await parser.parse(tag);
      const requestBody = result?.requestBody;

      expect(requestBody?.content?.["multipart/form-data"]?.schema).toEqual({
        type: "object",
        properties: {
          file: { type: "string", format: "binary" },
          metadata: {
            type: "object",
            properties: {
              name: { type: "string" },
              size: { type: "integer" },
            },
          },
        },
      });
      expect(requestBody?.content?.["multipart/form-data"]?.encoding).toEqual({
        file: { contentType: "image/*" },
        metadata: { contentType: "application/json" },
      });
    });

    it("应该正确处理带示例的内容类型", async () => {
      const tag = createJSDocTag(`@requestBody 用户信息
       required: true
       content:
         application/json:
           schema:
             type: object
             properties:
               name:
                 type: string
               age:
                 type: integer
           examples:
             example1:
               summary: 普通用户
               value:
                 name: 张三
                 age: 25
             example2:
               summary: 管理员
               value:
                 name: 李四
                 age: 30`);

      const result = await parser.parse(tag);
      const requestBody = result?.requestBody;

      expect(requestBody?.content?.["application/json"]?.examples).toEqual({
        example1: {
          summary: "普通用户",
          value: { name: "张三", age: 25 },
        },
        example2: {
          summary: "管理员",
          value: { name: "李四", age: 30 },
        },
      });
    });

    it("应该在没有YAML参数时抛出错误", async () => {
      const tag = createJSDocTag("@requestBody 用户注册信息");
      await expect(parser.parse(tag)).rejects.toThrow(/@requestBody 标签必须包含 YAML 参数/);
    });

    it("应该在YAML参数为空时抛出错误", async () => {
      const tag = createJSDocTag(`@requestBody 用户注册信息
       # 空的YAML参数`);
      await expect(parser.parse(tag)).rejects.toThrow(/@requestBody 标签必须包含 YAML 参数/);
    });
  });

  describe("边界情况", () => {
    it("应该正确处理Unicode字符", async () => {
      const tag = createJSDocTag(`@requestBody 用户注册信息🚀
       required: true
       content:
         application/json:
           schema:
             type: object`);

      const result = await parser.parse(tag);
      expect(result?.requestBody?.description).toBe("用户注册信息🚀");
    });

    it("应该正确处理包含emoji的描述", async () => {
      const testCases = [
        { input: "@requestBody ✅有效数据", expected: "✅有效数据" },
        { input: "@requestBody 📊数据统计", expected: "📊数据统计" },
        {
          input: "@requestBody 🔄状态更新",
          expected: "🔄状态更新",
        },
      ];

      for (const { input, expected } of testCases) {
        const tag = createJSDocTag(`${input}
         required: true
         content:
           application/json:
             schema:
               type: object`);

        const result = await parser.parse(tag);
        expect(result?.requestBody?.description).toBe(expected);
      }
    });

    it("应该正确处理包含数字的描述", async () => {
      const tag = createJSDocTag(`@requestBody 版本2.0的API数据
       required: true
       content:
         application/json:
           schema:
             type: object`);

      const result = await parser.parse(tag);
      expect(result?.requestBody?.description).toBe("版本2.0的API数据");
    });

    it("应该正确处理包含标点符号的描述", async () => {
      const testCases = [
        "@requestBody 用户数据（包含个人信息）",
        "@requestBody 配置文件：JSON格式",
        "@requestBody 上传数据，支持多种格式！",
      ];

      for (const input of testCases) {
        const tag = createJSDocTag(`${input}
         required: true
         content:
           application/json:
             schema:
               type: object`);

        const result = await parser.parse(tag);
        expect(result).toHaveProperty("requestBody");
        expect(result?.requestBody).toHaveProperty("description");
      }
    });

    it("应该正确处理多行描述文本", async () => {
      const tag = createJSDocTag(`@requestBody 用户注册请求
       description: |
         包含用户基本信息
         必需字段：姓名、邮箱
         可选字段：电话、地址
       required: true
       content:
         application/json:
           schema:
             type: object`);

      const result = await parser.parse(tag);
      expect(result?.requestBody?.description).toBe(
        "包含用户基本信息\n必需字段：姓名、邮箱\n可选字段：电话、地址\n",
      );
    });

    it("应该正确处理不带描述只有YAML的情况", async () => {
      const tag = createJSDocTag(`@requestBody
       description: 从YAML中获取的描述
       required: true
       content:
         application/json:
           schema:
             type: object`);

      const result = await parser.parse(tag);
      expect(result?.requestBody?.description).toBe("从YAML中获取的描述");
      expect(result?.requestBody?.required).toBe(true);
    });

    it("应该正确处理只有扩展字段的YAML", async () => {
      const tag = createJSDocTag(`@requestBody
       required: true
       content:
         application/json:
           schema:
             type: object
       x-api-version: v2
       x-validation-level: strict
       x-deprecated-since: "3.0"`);

      const result = await parser.parse(tag);
      const requestBody = result?.requestBody;

      expect(requestBody?.description).toBeUndefined();
      expect(requestBody).toHaveProperty("x-api-version", "v2");
      expect(requestBody).toHaveProperty("x-validation-level", "strict");
      expect(requestBody).toHaveProperty("x-deprecated-since", "3.0");
    });

    it("应该正确处理包含冒号但不是YAML的文本", async () => {
      const tag = createJSDocTag(
        `@requestBody 时间格式:2023-12-25T10:30:00Z这不是YAML
         required: true
         content:
           application/json:
             schema:
               type: string`,
      );
      const result = await parser.parse(tag);
      expect(result?.requestBody?.description).toBe("时间格式:2023-12-25T10:30:00Z这不是YAML");
    });

    it("应该正确处理复杂的内容类型配置", async () => {
      const tag = createJSDocTag(`@requestBody 复杂数据上传
       required: true
       content:
         application/json:
           schema:
             type: object
             properties:
               data:
                 type: array
                 items:
                   type: object
           examples:
             simple:
               value:
                 data: [{"id": 1}]
         application/xml:
           schema:
             type: object
             xml:
               name: root
         text/plain:
           schema:
             type: string
             maxLength: 1000`);

      const result = await parser.parse(tag);
      const requestBody = result?.requestBody;

      expect(requestBody?.content).toHaveProperty("application/json");
      expect(requestBody?.content).toHaveProperty("application/xml");
      expect(requestBody?.content).toHaveProperty("text/plain");
      expect(requestBody?.content?.["application/json"]?.examples).toEqual({
        simple: { value: { data: [{ id: 1 }] } },
      });
      expect(requestBody?.content?.["application/xml"]?.schema).toEqual({
        type: "object",
        xml: { name: "root" },
      });
    });

    it("应该正确处理布尔类型的YAML值", async () => {
      const tag = createJSDocTag(`@requestBody 可选请求数据
       required: false
       content:
         application/json:
           schema:
             type: object
             required: true
             nullable: false`);

      const result = await parser.parse(tag);
      const requestBody = result?.requestBody;

      expect(requestBody?.required).toBe(false);
      expect(requestBody?.content?.["application/json"]?.schema).toEqual({
        type: "object",
        required: true,
        nullable: false,
      });
    });
  });
});
