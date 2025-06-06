import { describe, expect, it } from "vitest";
import type { MediaTypeObject } from "@/types";
import { ParameterBuilder } from "./ParameterBuilder";

describe("ParameterBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建带有名称和位置的默认参数对象（query参数）", () => {
      const builder = new ParameterBuilder("userId", "query");
      const result = builder.build();

      expect(result).toEqual({
        name: "userId",
        in: "query",
        required: undefined,
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

    it("应该创建header参数", () => {
      const builder = new ParameterBuilder("authorization", "header");
      const result = builder.build();

      expect(result).toEqual({
        name: "authorization",
        in: "header",
        required: undefined,
      });
    });

    it("应该创建cookie参数", () => {
      const builder = new ParameterBuilder("sessionId", "cookie");
      const result = builder.build();

      expect(result).toEqual({
        name: "sessionId",
        in: "cookie",
        required: undefined,
      });
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
    it("应该正确设置参数为必需", () => {
      const builder = new ParameterBuilder("userId", "query");

      const result = builder.setRequired(true).build();

      expect(result.required).toBe(true);
    });

    it("应该正确设置参数为非必需", () => {
      const builder = new ParameterBuilder("userId", "query");

      const result = builder.setRequired(false).build();

      expect(result.required).toBe(false);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("userId", "query");

      const returnValue = builder.setRequired(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setDeprecated", () => {
    it("应该正确设置参数为已废弃", () => {
      const builder = new ParameterBuilder("oldParam", "query");

      const result = builder.setDeprecated(true).build();

      expect(result.deprecated).toBe(true);
    });

    it("应该正确设置参数为未废弃", () => {
      const builder = new ParameterBuilder("newParam", "query");

      const result = builder.setDeprecated(false).build();

      expect(result.deprecated).toBe(false);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("oldParam", "query");

      const returnValue = builder.setDeprecated(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setAllowEmptyValue", () => {
    it("应该正确设置允许空值", () => {
      const builder = new ParameterBuilder("optionalParam", "query");

      const result = builder.setAllowEmptyValue(true).build();

      expect(result.allowEmptyValue).toBe(true);
    });

    it("应该正确设置不允许空值", () => {
      const builder = new ParameterBuilder("requiredParam", "query");

      const result = builder.setAllowEmptyValue(false).build();

      expect(result.allowEmptyValue).toBe(false);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("optionalParam", "query");

      const returnValue = builder.setAllowEmptyValue(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setStyle", () => {
    it("应该正确设置参数样式为 form", () => {
      const builder = new ParameterBuilder("arrayParam", "query");

      const result = builder.setStyle("form").build();

      expect(result.style).toBe("form");
    });

    it("应该正确设置参数样式为 simple", () => {
      const builder = new ParameterBuilder("pathParam", "path");

      const result = builder.setStyle("simple").build();

      expect(result.style).toBe("simple");
    });

    it("应该正确设置参数样式为 matrix", () => {
      const builder = new ParameterBuilder("matrixParam", "path");

      const result = builder.setStyle("matrix").build();

      expect(result.style).toBe("matrix");
    });

    it("应该正确设置参数样式为 label", () => {
      const builder = new ParameterBuilder("labelParam", "path");

      const result = builder.setStyle("label").build();

      expect(result.style).toBe("label");
    });

    it("应该正确设置参数样式为 spaceDelimited", () => {
      const builder = new ParameterBuilder("spaceParam", "query");

      const result = builder.setStyle("spaceDelimited").build();

      expect(result.style).toBe("spaceDelimited");
    });

    it("应该正确设置参数样式为 pipeDelimited", () => {
      const builder = new ParameterBuilder("pipeParam", "query");

      const result = builder.setStyle("pipeDelimited").build();

      expect(result.style).toBe("pipeDelimited");
    });

    it("应该正确设置参数样式为 deepObject", () => {
      const builder = new ParameterBuilder("deepParam", "query");

      const result = builder.setStyle("deepObject").build();

      expect(result.style).toBe("deepObject");
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("styleParam", "query");

      const returnValue = builder.setStyle("form");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setExplode", () => {
    it("应该正确设置展开对象为 true", () => {
      const builder = new ParameterBuilder("objectParam", "query");

      const result = builder.setExplode(true).build();

      expect(result.explode).toBe(true);
    });

    it("应该正确设置展开对象为 false", () => {
      const builder = new ParameterBuilder("arrayParam", "query");

      const result = builder.setExplode(false).build();

      expect(result.explode).toBe(false);
    });

    it("应该支持链式调用", () => {
      const builder = new ParameterBuilder("explodeParam", "query");

      const returnValue = builder.setExplode(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setAllowReserved", () => {
    it("应该正确设置允许保留字符为 true", () => {
      const builder = new ParameterBuilder("reservedParam", "query");

      const result = builder.setAllowReserved(true).build();

      expect(result.allowReserved).toBe(true);
    });

    it("应该正确设置允许保留字符为 false", () => {
      const builder = new ParameterBuilder("normalParam", "query");

      const result = builder.setAllowReserved(false).build();

      expect(result.allowReserved).toBe(false);
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

  describe("复杂场景测试", () => {
    it("应该支持所有方法的链式调用组合", () => {
      const builder = new ParameterBuilder("complexParam", "query");
      const schema = { type: "string" as const, enum: ["active", "inactive"] };
      const mediaTypeObject: MediaTypeObject = {
        schema: { type: "object" },
      };

      const result = builder
        .setDescription("复杂参数示例")
        .setRequired(true)
        .setDeprecated(false)
        .setAllowEmptyValue(false)
        .setStyle("form")
        .setExplode(true)
        .setAllowReserved(false)
        .setSchema(schema)
        .addContent("application/json", mediaTypeObject)
        .addExtension("x-custom", "value")
        .build();

      expect(result).toEqual({
        name: "complexParam",
        in: "query",
        description: "复杂参数示例",
        required: true,
        deprecated: false,
        allowEmptyValue: false,
        style: "form",
        explode: true,
        allowReserved: false,
        schema: schema,
        content: {
          "application/json": mediaTypeObject,
        },
        "x-custom": "value",
      });
    });

    it("应该在多次调用 build 方法时返回不同的对象引用", () => {
      const builder = new ParameterBuilder("testParam", "query");
      builder.setDescription("测试描述");

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).not.toBe(result2);
    });

    it("应该正确处理路径参数的默认必需设置", () => {
      const builder = new ParameterBuilder("id", "path");

      // 即使显式设置为 false，路径参数在构造时已经设置为 true
      const result = builder.setRequired(false).build();

      expect(result.required).toBe(false); // 应该允许覆盖
    });

    it("应该正确处理非路径参数的必需设置", () => {
      const builder = new ParameterBuilder("filter", "query");

      const result = builder.build();

      expect(result.required).toBeUndefined(); // 非路径参数默认不设置 required
    });
  });
});
