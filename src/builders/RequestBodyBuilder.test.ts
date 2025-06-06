import { describe, expect, it } from "vitest";
import type { MediaTypeObject } from "@/types";
import { RequestBodyBuilder } from "./RequestBodyBuilder";

describe("RequestBodyBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建带有空内容的默认请求体对象", () => {
      const builder = new RequestBodyBuilder();
      const result = builder.build();

      expect(result).toEqual({
        content: {},
      });
    });
  });

  describe("setDescription", () => {
    it("应该正确设置请求体描述", () => {
      const builder = new RequestBodyBuilder();
      const description = "用户注册请求体";

      const result = builder.setDescription(description).build();

      expect(result.description).toBe(description);
    });

    it("应该支持链式调用", () => {
      const builder = new RequestBodyBuilder();
      const returnValue = builder.setDescription("测试描述");

      expect(returnValue).toBe(builder);
    });
  });

  describe("addContent", () => {
    it("应该添加单个内容类型", () => {
      const builder = new RequestBodyBuilder();
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
      const builder = new RequestBodyBuilder();
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
      const builder = new RequestBodyBuilder();
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
      const builder = new RequestBodyBuilder();
      const mediaTypeObject: MediaTypeObject = {
        schema: { type: "object" },
      };

      const returnValue = builder.addContent("application/json", mediaTypeObject);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setRequired", () => {
    it("应该正确设置请求体为必需", () => {
      const builder = new RequestBodyBuilder();

      const result = builder.setRequired(true).build();

      expect(result.required).toBe(true);
    });

    it("应该正确设置请求体为非必需", () => {
      const builder = new RequestBodyBuilder();

      const result = builder.setRequired(false).build();

      expect(result.required).toBe(false);
    });

    it("应该支持链式调用", () => {
      const builder = new RequestBodyBuilder();

      const returnValue = builder.setRequired(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addExtension", () => {
    it("应该添加有效的扩展字段", () => {
      const builder = new RequestBodyBuilder();
      const extensionValue = { customData: "test" };

      const result = builder.addExtension("x-custom-extension", extensionValue).build();

      expect(result["x-custom-extension"]).toStrictEqual(extensionValue);
    });

    it("应该支持添加多个扩展字段", () => {
      const builder = new RequestBodyBuilder();
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
      const builder = new RequestBodyBuilder();
      const firstValue = "first";
      const secondValue = "second";

      const result = builder
        .addExtension("x-duplicate", firstValue)
        .addExtension("x-duplicate", secondValue)
        .build();

      expect(result["x-duplicate"]).toStrictEqual(firstValue); // 应该保持第一个添加的值
    });

    it("应该支持链式调用", () => {
      const builder = new RequestBodyBuilder();

      const returnValue = builder.addExtension("x-test", "value");

      expect(returnValue).toBe(builder);
    });
  });

  describe("复杂场景测试", () => {
    it("应该支持所有方法的链式调用组合", () => {
      const builder = new RequestBodyBuilder();
      const mediaTypeObject: MediaTypeObject = {
        schema: { type: "object" },
        example: { name: "测试用户", email: "test@example.com" },
      };

      const result = builder
        .setDescription("用户创建请求体")
        .addContent("application/json", mediaTypeObject)
        .setRequired(true)
        .addExtension("x-custom", "value")
        .build();

      expect(result).toEqual({
        description: "用户创建请求体",
        content: {
          "application/json": mediaTypeObject,
        },
        required: true,
        "x-custom": "value",
      });
    });

    it("应该在多次调用 build 方法时返回不同的对象引用", () => {
      const builder = new RequestBodyBuilder();
      builder.setDescription("测试描述");

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).not.toBe(result2);
    });

    it("应该支持构建完整的请求体对象", () => {
      const builder = new RequestBodyBuilder();
      const jsonMediaType: MediaTypeObject = {
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "integer" },
          },
          required: ["name"],
        },
        example: { name: "张三", age: 30 },
      };
      const formMediaType: MediaTypeObject = {
        schema: {
          type: "object",
          properties: {
            file: { type: "string" },
          },
        },
      };

      const result = builder
        .setDescription("多媒体类型请求体")
        .addContent("application/json", jsonMediaType)
        .addContent("multipart/form-data", formMediaType)
        .setRequired(true)
        .addExtension("x-validation", { strict: true })
        .addExtension("x-timeout", 30000)
        .build();

      expect(result).toEqual({
        description: "多媒体类型请求体",
        content: {
          "application/json": jsonMediaType,
          "multipart/form-data": formMediaType,
        },
        required: true,
        "x-validation": { strict: true },
        "x-timeout": 30000,
      });
    });
  });
});
