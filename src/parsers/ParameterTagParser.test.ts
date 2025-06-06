import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { JSDocTagName } from "@/constants";
import { ParameterTagParser } from "./ParameterTagParser";

describe("ParameterTagParser", () => {
  let parser: ParameterTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new ParameterTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual([JSDocTagName.PARAMETER]);
    });
  });

  describe("parse", () => {
    it("应该正确解析有效的参数标签", async () => {
      const validCases = [
        {
          input: "@parameter userId path 用户ID",
          expected: {
            name: "userId",
            in: "path",
            description: "用户ID",
            required: true,
          },
        },
        {
          input: "@parameter page query 页码",
          expected: {
            name: "page",
            in: "query",
            description: "页码",
          },
        },
        {
          input: "@parameter Authorization header 认证令牌",
          expected: {
            name: "Authorization",
            in: "header",
            description: "认证令牌",
          },
        },
        {
          input: "@parameter sessionId cookie 会话ID",
          expected: {
            name: "sessionId",
            in: "cookie",
            description: "会话ID",
          },
        },
      ];

      for (const { input, expected } of validCases) {
        const tag = createJSDocTag(input);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          parameter: expected,
        });
      }
    });

    it("应该正确解析所有支持的参数位置", async () => {
      const validPositions = [
        { position: "query", expectRequired: undefined },
        { position: "header", expectRequired: undefined },
        { position: "path", expectRequired: true },
        { position: "cookie", expectRequired: undefined },
      ];

      for (const { position, expectRequired } of validPositions) {
        const tag = createJSDocTag(`@parameter testParam ${position} 测试参数`);
        const result = await parser.parse(tag);
        const expected = {
          name: "testParam",
          in: position,
          description: "测试参数",
          required: expectRequired,
        };

        expect(result).toEqual({
          parameter: expected,
        });
      }
    });

    it("应该正确解析不带描述的参数", async () => {
      const tag = createJSDocTag("@parameter userId path");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameter: {
          name: "userId",
          in: "path",
          required: true,
        },
      });
    });

    it("应该正确处理多个单词的描述", async () => {
      const tag = createJSDocTag("@parameter userId path 用户唯一标识符");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameter: {
          name: "userId",
          in: "path",
          description: "用户唯一标识符",
          required: true,
        },
      });
    });

    it("应该正确处理包含特殊字符的描述", async () => {
      const tag = createJSDocTag("@parameter page query 页码-默认为1，范围1-100");
      const result = await parser.parse(tag);
      expect(result).toEqual({
        parameter: {
          name: "page",
          in: "query",
          description: "页码-默认为1，范围1-100",
        },
      });
    });

    it("应该正确处理带 YAML 参数的参数", async () => {
      const tag = createJSDocTag(`@parameter page query 页码
       required: true
       schema:
         type: integer
         minimum: 1
         maximum: 100
         default: 1`);
      const result = await parser.parse(tag);
      expect(result).toHaveProperty("parameter");
      expect(result?.parameter?.name).toBe("page");
      expect(result?.parameter?.in).toBe("query");
      expect(result?.parameter?.required).toBe(true);
      expect(result?.parameter?.schema).toEqual({
        type: "integer",
        minimum: 1,
        maximum: 100,
        default: 1,
      });
    });

    it("应该正确处理带扩展属性的 YAML 参数", async () => {
      const tag = createJSDocTag(`@parameter userId path 用户ID
       x-custom-field: custom-value
       x-validation: strict`);
      const result = await parser.parse(tag);
      expect(result).toHaveProperty("parameter");
      expect(result?.parameter).toHaveProperty("x-custom-field", "custom-value");
      expect(result?.parameter).toHaveProperty("x-validation", "strict");
    });

    it("应该正确处理所有 YAML 字段", async () => {
      const tag = createJSDocTag(`@parameter searchQuery query 搜索查询
       description: 用于搜索的关键词
       required: true
       deprecated: false
       allowEmptyValue: true
       style: form
       explode: true
       allowReserved: false
       schema:
         type: string
         minLength: 1
         maxLength: 100
       content:
         application/json:
           schema:
             type: string
       x-custom-header: custom-value
       x-validation-rule: required`);

      const result = await parser.parse(tag);
      const parameter = result?.parameter;

      expect(parameter?.description).toBe("用于搜索的关键词");
      expect(parameter?.required).toBe(true);
      expect(parameter?.deprecated).toBe(false);
      expect(parameter?.allowEmptyValue).toBe(true);
      expect(parameter?.style).toBe("form");
      expect(parameter?.explode).toBe(true);
      expect(parameter?.allowReserved).toBe(false);
      expect(parameter?.schema).toEqual({
        type: "string",
        minLength: 1,
        maxLength: 100,
      });
      expect(parameter?.content).toHaveProperty("application/json");
      expect(parameter).toHaveProperty("x-custom-header", "custom-value");
      expect(parameter).toHaveProperty("x-validation-rule", "required");
    });

    it("应该在参数为空时抛出错误", async () => {
      const tag = createJSDocTag("@parameter");
      await expect(parser.parse(tag)).rejects.toThrow(/@parameter 标签 name 不能为空/);
    });

    it("应该在参数数量不足时抛出错误", async () => {
      const tag = createJSDocTag("@parameter userId");
      await expect(parser.parse(tag)).rejects.toThrow(/@parameter 标签 in 不能为空/);
    });

    it("应该在参数名格式无效时抛出错误", async () => {
      const invalidNames = ["123id", "-invalid", "invalid@name"];
      for (const name of invalidNames) {
        const tag = createJSDocTag(`@parameter ${name} path 测试参数`);
        await expect(parser.parse(tag)).rejects.toThrow(/@parameter 标签 name 格式不正确/);
      }
    });

    it("应该接受所有有效的参数名格式", async () => {
      const validNames = [
        "userId",
        "user_id",
        "user-name",
        "api.version",
        "_private",
        "a",
        "_",
        "userId123",
        "user_name_123",
      ];

      for (const name of validNames) {
        const tag = createJSDocTag(`@parameter ${name} query 测试参数`);
        const result = await parser.parse(tag);
        expect(result?.parameter?.name).toBe(name);
      }
    });

    it("应该在参数位置无效时抛出错误", async () => {
      const invalidPositions = ["body", "form", "invalid", ""];
      for (const position of invalidPositions) {
        const tag = createJSDocTag(`@parameter testParam ${position} 测试参数`);
        await expect(parser.parse(tag)).rejects.toThrow(/@parameter 标签 in 值不正确/);
      }
    });

    it("应该正确处理 YAML 中覆盖描述的情况", async () => {
      const tag = createJSDocTag(`@parameter userId path 原始描述
       description: YAML中的新描述`);
      const result = await parser.parse(tag);
      expect(result?.parameter?.description).toBe("YAML中的新描述");
    });

    it("应该正确处理空格描述的情况", async () => {
      const tag = createJSDocTag("@parameter userId path   ");
      const result = await parser.parse(tag);
      expect(result?.parameter?.name).toBe("userId");
      expect(result?.parameter?.in).toBe("path");
      expect(result?.parameter?.required).toBe(true);
      expect(result?.parameter?.description).toBeUndefined();
    });

    it("应该正确处理复杂的内容类型配置", async () => {
      const tag = createJSDocTag(`@parameter data query 复杂数据
       content:
         application/json:
           schema:
             type: object
             properties:
               name:
                 type: string
         application/xml:
           schema:
             type: object
         text/plain:
           schema:
             type: string`);

      const result = await parser.parse(tag);
      const parameter = result?.parameter;

      expect(parameter?.content).toHaveProperty("application/json");
      expect(parameter?.content).toHaveProperty("application/xml");
      expect(parameter?.content).toHaveProperty("text/plain");
      expect(parameter?.content?.["application/json"]?.schema).toEqual({
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
      });
    });
  });

  describe("边界情况", () => {
    it("应该正确处理Unicode字符", async () => {
      const tag = createJSDocTag("@parameter userId path 用户标识符🆔");
      const result = await parser.parse(tag);
      expect(result?.parameter?.description).toBe("用户标识符🆔");
    });

    it("应该正确处理包含emoji的参数描述", async () => {
      const testCases = [
        { input: "@parameter page query ✅页码参数", expected: "✅页码参数" },
        { input: "@parameter limit query 📊分页大小", expected: "📊分页大小" },
        {
          input: "@parameter status query 🔄状态过滤",
          expected: "🔄状态过滤",
        },
      ];

      for (const { input, expected } of testCases) {
        const tag = createJSDocTag(input);
        const result = await parser.parse(tag);
        expect(result?.parameter?.description).toBe(expected);
      }
    });

    it("应该正确处理包含数字的描述", async () => {
      const tag = createJSDocTag("@parameter limit query 最多返回100条记录");
      const result = await parser.parse(tag);
      expect(result?.parameter?.description).toBe("最多返回100条记录");
    });

    it("应该正确处理包含标点符号的描述", async () => {
      const testCases = [
        "@parameter page query 页码（默认为1）",
        "@parameter sort query 排序字段：name, age, created_at",
        "@parameter filter query 过滤条件，支持多种格式！",
      ];

      for (const input of testCases) {
        const tag = createJSDocTag(input);
        const result = await parser.parse(tag);
        expect(result).toHaveProperty("parameter");
        expect(result?.parameter).toHaveProperty("description");
      }
    });

    it("应该正确处理多行描述文本", async () => {
      const tag = createJSDocTag(`@parameter filter query
        description: |
          支持多种类型：
          - 字符串匹配
          - 数值范围
          - 日期区间`);
      const result = await parser.parse(tag);
      expect(result?.parameter?.description).toBe(
        "支持多种类型：\n- 字符串匹配\n- 数值范围\n- 日期区间\n",
      );
    });

    it("应该正确处理不带描述只有YAML的情况", async () => {
      const tag = createJSDocTag(`@parameter userId path
       description: 从YAML中获取的描述
       required: true`);
      const result = await parser.parse(tag);
      expect(result?.parameter?.description).toBe("从YAML中获取的描述");
      expect(result?.parameter?.required).toBe(true);
    });

    it("应该正确处理只有扩展字段的YAML", async () => {
      const tag = createJSDocTag(`@parameter apiKey header
       x-api-version: v1
       x-required-scope: read
       x-deprecated-since: "2.0"`);

      const result = await parser.parse(tag);
      const parameter = result?.parameter;

      expect(parameter?.description).toBeUndefined();
      expect(parameter).toHaveProperty("x-api-version", "v1");
      expect(parameter).toHaveProperty("x-required-scope", "read");
      expect(parameter).toHaveProperty("x-deprecated-since", "2.0");
    });

    it("应该正确处理包含冒号但不是YAML的文本", async () => {
      const tag = createJSDocTag(
        "@parameter timestamp query 时间格式:2023-12-25T10:30:00Z这不是YAML",
      );
      const result = await parser.parse(tag);
      expect(result?.parameter?.description).toBe("时间格式:2023-12-25T10:30:00Z这不是YAML");
    });

    it("应该正确处理复杂的参数名格式", async () => {
      const complexNames = [
        "X-Custom-Header",
        "api.v2.version",
        "_internal_param",
        "user123_data",
        "filter-by-name",
      ];

      for (const name of complexNames) {
        const tag = createJSDocTag(`@parameter ${name} query 复杂参数`);
        const result = await parser.parse(tag);
        expect(result?.parameter?.name).toBe(name);
      }
    });

    it("应该正确处理布尔类型的YAML值", async () => {
      const tag = createJSDocTag(`@parameter optional query 可选参数
       required: false
       deprecated: true
       allowEmptyValue: false
       explode: false
       allowReserved: true`);

      const result = await parser.parse(tag);
      const parameter = result?.parameter;

      expect(parameter?.required).toBe(false);
      expect(parameter?.deprecated).toBe(true);
      expect(parameter?.allowEmptyValue).toBe(false);
      expect(parameter?.explode).toBe(false);
      expect(parameter?.allowReserved).toBe(true);
    });
  });
});
