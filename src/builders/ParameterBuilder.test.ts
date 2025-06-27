import { describe, expect, it } from "vitest";
import type { MediaTypeObject } from "@/types/openapi";
import { ParameterBuilder } from "./ParameterBuilder";

describe("ParameterBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建带有名称和位置的默认参数对象（query参数）", () => {
      const builder = new ParameterBuilder("userId", "query");
      const result = builder.build();

      expect(result).toEqual({
        name: "userId",
        in: "query",
      });
    });

    it("应该创建带有名称和位置的默认参数对象（path参数，自动设置为必需）", () => {
      const builder = new ParameterBuilder("id", "path");
      const result = builder.build();

      expect(result).toEqual({
        name: "id",
        in: "path",
        required: true,
      });
    });

    it("应该在多次调用 build 方法时返回不同的对象引用", () => {
      const builder = new ParameterBuilder("testParam", "query");
      builder.setDescription("测试描述");

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });

    it("应该创建header参数", () => {
      const builder = new ParameterBuilder("authorization", "header");
      const result = builder.build();

      expect(result).toEqual({
        name: "authorization",
        in: "header",
      });
    });

    it("应该创建cookie参数", () => {
      const builder = new ParameterBuilder("sessionId", "cookie");
      const result = builder.build();

      expect(result).toEqual({
        name: "sessionId",
        in: "cookie",
      });
    });

    it("应该正确处理路径参数的默认必需设置", () => {
      const builder = new ParameterBuilder("id", "path");
      const result = builder.setRequired(false).build();

      expect(result.required).toBe(false);
    });

    it("应该正确处理非路径参数的必需设置", () => {
      const builder = new ParameterBuilder("filter", "query");
      const result = builder.build();

      expect(result.required).toBeUndefined();
    });
  });

  describe("getName", () => {
    it("应该返回正确的参数名称", () => {
      const builder = new ParameterBuilder("testParam", "query");

      expect(builder.getName()).toBe("testParam");
    });
  });

  describe("getIn", () => {
    it("应该返回正确的参数位置", () => {
      const builder = new ParameterBuilder("testParam", "header");

      expect(builder.getIn()).toBe("header");
    });
  });

  describe("setDescription", () => {
    it("应该正确设置参数描述", () => {
      const builder = new ParameterBuilder("userId", "query");
      const description = "用户ID";
      const result = builder.setDescription(description).build();

      expect(result.description).toBe(description);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("userId", "query");
      const returnValue = builder.setDescription("测试描述");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setRequired", () => {
    it.each([
      { value: true, description: "必需" },
      { value: false, description: "非必需" },
    ])("应该正确设置参数为$description", ({ value }) => {
      const builder = new ParameterBuilder("userId", "query");
      const result = builder.setRequired(value).build();

      expect(result.required).toBe(value);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("userId", "query");
      const returnValue = builder.setRequired(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setDeprecated", () => {
    it.each([
      { value: true, description: "已废弃", paramName: "oldParam" },
      { value: false, description: "未废弃", paramName: "newParam" },
    ])("应该正确设置参数为$description", ({ value, paramName }) => {
      const builder = new ParameterBuilder(paramName, "query");
      const result = builder.setDeprecated(value).build();

      expect(result.deprecated).toBe(value);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("oldParam", "query");
      const returnValue = builder.setDeprecated(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setAllowEmptyValue", () => {
    it.each([
      { value: true, description: "允许空值", paramName: "optionalParam" },
      { value: false, description: "不允许空值", paramName: "requiredParam" },
    ])("应该正确设置$description", ({ value, paramName }) => {
      const builder = new ParameterBuilder(paramName, "query");
      const result = builder.setAllowEmptyValue(value).build();

      expect(result.allowEmptyValue).toBe(value);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("optionalParam", "query");
      const returnValue = builder.setAllowEmptyValue(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setStyle", () => {
    const styleTestCases = [
      { style: "form", paramName: "arrayParam", paramIn: "query" },
      { style: "simple", paramName: "pathParam", paramIn: "path" },
      { style: "matrix", paramName: "matrixParam", paramIn: "path" },
      { style: "label", paramName: "labelParam", paramIn: "path" },
      { style: "spaceDelimited", paramName: "spaceParam", paramIn: "query" },
      { style: "pipeDelimited", paramName: "pipeParam", paramIn: "query" },
      { style: "deepObject", paramName: "deepParam", paramIn: "query" },
    ] as const;

    it.each(styleTestCases)("应该正确设置参数样式为 $style", ({ style, paramName, paramIn }) => {
      const builder = new ParameterBuilder(paramName, paramIn);
      const result = builder.setStyle(style).build();

      expect(result.style).toBe(style);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("styleParam", "query");
      const returnValue = builder.setStyle("form");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setExplode", () => {
    it.each([
      { value: true, description: "true", paramName: "objectParam" },
      { value: false, description: "false", paramName: "arrayParam" },
    ])("应该正确设置展开对象为 $description", ({ value, paramName }) => {
      const builder = new ParameterBuilder(paramName, "query");
      const result = builder.setExplode(value).build();

      expect(result.explode).toBe(value);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("explodeParam", "query");
      const returnValue = builder.setExplode(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setAllowReserved", () => {
    it.each([
      { value: true, description: "true", paramName: "reservedParam" },
      { value: false, description: "false", paramName: "normalParam" },
    ])("应该正确设置允许保留字符为 $description", ({ value, paramName }) => {
      const builder = new ParameterBuilder(paramName, "query");
      const result = builder.setAllowReserved(value).build();

      expect(result.allowReserved).toBe(value);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("reservedParam", "query");
      const returnValue = builder.setAllowReserved(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setSchema", () => {
    it("应该正确设置参数 Schema 对象", () => {
      const builder = new ParameterBuilder("stringParam", "query");
      const schema = { type: "string" as const, minLength: 1, maxLength: 100 };
      const result = builder.setSchema(schema).build();

      expect(result.schema).toEqual(schema);
    });

    it("应该正确设置参数 Schema 引用对象", () => {
      const builder = new ParameterBuilder("refParam", "query");
      const schemaRef = { $ref: "#/components/schemas/UserSchema" };
      const result = builder.setSchema(schemaRef).build();

      expect(result.schema).toEqual(schemaRef);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("schemaParam", "query");
      const schema = { type: "integer" as const };
      const returnValue = builder.setSchema(schema);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addContent", () => {
    it("应该添加单个内容类型", () => {
      const builder = new ParameterBuilder("complexParam", "query");
      const mediaTypeObject: MediaTypeObject = {
        schema: { type: "object" },
        example: { name: "张三", age: 25 },
      };
      const result = builder.addContent("application/json", mediaTypeObject).build();

      expect(result.content).toEqual({
        "application/json": mediaTypeObject,
      });
    });

    it("不应该重复添加相同的媒体类型", () => {
      const builder = new ParameterBuilder("duplicateParam", "query");
      const firstMediaType: MediaTypeObject = {
        schema: { type: "object" },
        example: { message: "first" },
      };
      const secondMediaType: MediaTypeObject = {
        schema: { type: "object" },
        example: { message: "second" },
      };
      const result = builder
        .addContent("application/json", firstMediaType)
        .addContent("application/json", secondMediaType)
        .build();

      expect(result.content).toEqual({
        "application/json": firstMediaType,
      });
    });

    it("应该支持添加多种不同的媒体类型", () => {
      const builder = new ParameterBuilder("multiParam", "query");
      const jsonMediaType: MediaTypeObject = {
        schema: { type: "object" },
      };
      const xmlMediaType: MediaTypeObject = {
        schema: { type: "string" },
      };
      const result = builder
        .addContent("application/json", jsonMediaType)
        .addContent("application/xml", xmlMediaType)
        .build();

      expect(result.content).toEqual({
        "application/json": jsonMediaType,
        "application/xml": xmlMediaType,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("contentParam", "query");
      const mediaTypeObject: MediaTypeObject = {
        schema: { type: "object" },
      };
      const returnValue = builder.addContent("application/json", mediaTypeObject);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setExample", () => {
    it("应该正确设置单个示例", () => {
      const builder = new ParameterBuilder("stringParam", "query");
      const example = "示例值";
      const result = builder.setExample(example).build();

      expect(result.example).toBe(example);
    });

    it("应该覆盖之前设置的示例", () => {
      const builder = new ParameterBuilder("overrideParam", "query");
      const firstExample = "first";
      const secondExample = "second";
      const result = builder.setExample(firstExample).setExample(secondExample).build();

      expect(result.example).toBe(secondExample);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("chainParam", "query");
      const returnValue = builder.setExample("test");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setExamples", () => {
    it("应该正确设置多个示例", () => {
      const builder = new ParameterBuilder("multiExampleParam", "query");
      const examples = {
        example1: {
          summary: "示例1",
          value: "值1",
        },
        example2: {
          summary: "示例2",
          value: "值2",
        },
      };
      const result = builder.setExamples(examples).build();

      expect(result.examples).toEqual(examples);
    });

    it("应该正确设置带有引用的示例", () => {
      const builder = new ParameterBuilder("refExampleParam", "query");
      const examples = {
        example1: {
          summary: "普通示例",
          value: "test",
        },
        example2: {
          $ref: "#/components/examples/UserExample",
        },
      };
      const result = builder.setExamples(examples).build();

      expect(result.examples).toEqual(examples);
    });

    it("应该覆盖之前设置的示例", () => {
      const builder = new ParameterBuilder("overrideExamplesParam", "query");
      const firstExamples = {
        first: {
          value: "first",
        },
      };
      const secondExamples = {
        second: {
          value: "second",
        },
      };
      const result = builder.setExamples(firstExamples).setExamples(secondExamples).build();

      expect(result.examples).toEqual(secondExamples);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("chainExampleParam", "query");
      const examples = {
        test: {
          value: "test",
        },
      };
      const returnValue = builder.setExamples(examples);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addExtension", () => {
    it("应该添加有效的扩展字段", () => {
      const builder = new ParameterBuilder("extParam", "query");
      const extensionValue = { customData: "test" };
      const result = builder.addExtension("x-custom-extension", extensionValue).build();

      expect(result["x-custom-extension"]).toStrictEqual(extensionValue);
    });

    it("应该支持添加多个扩展字段", () => {
      const builder = new ParameterBuilder("multiExtParam", "query");
      const extension1 = "value1";
      const extension2 = { data: "value2" };
      const result = builder
        .addExtension("x-extension-1", extension1)
        .addExtension("x-extension-2", extension2)
        .build();

      expect(result["x-extension-1"]).toStrictEqual(extension1);
      expect(result["x-extension-2"]).toStrictEqual(extension2);
    });

    it("不应该重复添加相同的扩展字段", () => {
      const builder = new ParameterBuilder("dupExtParam", "query");
      const firstValue = "first";
      const secondValue = "second";
      const result = builder
        .addExtension("x-duplicate", firstValue)
        .addExtension("x-duplicate", secondValue)
        .build();

      expect(result["x-duplicate"]).toBe(firstValue); // 应该保持第一个添加的值
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("chainParam", "query");
      const returnValue = builder.addExtension("x-test", "value");

      expect(returnValue).toBe(builder);
    });
  });
});
