import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import type { EncodingObject, ExampleObject, ReferenceObject, SchemaObject } from "@/types";
import { MediaTypeBuilder } from "./MediaTypeBuilder";

describe("MediaTypeBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建空的默认媒体类型对象", () => {
      const builder = new MediaTypeBuilder();
      const result = builder.build();

      expect(result).toEqual({});
    });

    it("应该在多次调用 build 方法时返回不同的对象引用", () => {
      const builder = new MediaTypeBuilder();
      builder.setExample({ message: "test" });

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe("setSchema", () => {
    it("应该正确设置 Schema 对象", () => {
      const builder = new MediaTypeBuilder();
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "number" },
          name: { type: "string" },
        },
      };
      const result = builder.setSchema(schema).build();

      expect(result.schema).toEqual(schema);
    });

    it("应该正确设置布尔值 Schema", () => {
      const builder = new MediaTypeBuilder();
      const result = builder.setSchema(true).build();

      expect(result.schema).toBe(true);
    });

    it("应该正确设置 Zod schema", () => {
      const builder = new MediaTypeBuilder();
      const zodSchema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = builder.setSchema(zodSchema).build();

      expect(result.schema).toEqual({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name", "age"],
        additionalProperties: false,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new MediaTypeBuilder();
      const returnValue = builder.setSchema({ type: "string" });

      expect(returnValue).toBe(builder);
    });
  });

  describe("setExample", () => {
    it("应该正确设置字符串示例", () => {
      const builder = new MediaTypeBuilder();
      const example = "test example";
      const result = builder.setExample(example).build();

      expect(result.example).toBe(example);
    });

    it("应该正确设置对象示例", () => {
      const builder = new MediaTypeBuilder();
      const example = { id: 1, name: "测试用户" };
      const result = builder.setExample(example).build();

      expect(result.example).toEqual(example);
    });

    it("应该正确设置数组示例", () => {
      const builder = new MediaTypeBuilder();
      const example = [{ id: 1 }, { id: 2 }];
      const result = builder.setExample(example).build();

      expect(result.example).toEqual(example);
    });

    it("应该支持链式调用", () => {
      const builder = new MediaTypeBuilder();
      const returnValue = builder.setExample("test");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setExamples", () => {
    it("应该正确设置多个示例", () => {
      const builder = new MediaTypeBuilder();
      const examples: Record<string, ExampleObject | ReferenceObject> = {
        success: {
          summary: "成功响应示例",
          value: { status: "success", data: {} },
        },
        error: {
          summary: "错误响应示例",
          value: { status: "error", message: "Something went wrong" },
        },
      };
      const result = builder.setExamples(examples).build();

      expect(result.examples).toEqual(examples);
    });

    it("应该正确设置引用对象示例", () => {
      const builder = new MediaTypeBuilder();
      const examples: Record<string, ExampleObject | ReferenceObject> = {
        userExample: {
          $ref: "#/components/examples/UserExample",
        },
      };
      const result = builder.setExamples(examples).build();

      expect(result.examples).toEqual(examples);
    });

    it("应该支持链式调用", () => {
      const builder = new MediaTypeBuilder();
      const returnValue = builder.setExamples({});

      expect(returnValue).toBe(builder);
    });
  });

  describe("addEncoding", () => {
    it("应该添加单个属性的编码信息", () => {
      const builder = new MediaTypeBuilder();
      const encodingObject: EncodingObject = {
        contentType: "application/json",
        style: "form",
        explode: false,
      };
      const result = builder.addEncoding("data", encodingObject).build();

      expect(result.encoding).toEqual({
        data: encodingObject,
      });
    });

    it("应该支持添加多个不同属性的编码信息", () => {
      const builder = new MediaTypeBuilder();
      const encoding1: EncodingObject = {
        contentType: "image/png",
      };
      const encoding2: EncodingObject = {
        style: "deepObject",
        explode: true,
      };
      const result = builder
        .addEncoding("image", encoding1)
        .addEncoding("metadata", encoding2)
        .build();

      expect(result.encoding).toEqual({
        image: encoding1,
        metadata: encoding2,
      });
    });

    it("不应该重复添加相同属性名的编码信息", () => {
      const builder = new MediaTypeBuilder();
      const firstEncoding: EncodingObject = {
        contentType: "image/png",
      };
      const secondEncoding: EncodingObject = {
        contentType: "image/jpeg",
      };
      const result = builder
        .addEncoding("image", firstEncoding)
        .addEncoding("image", secondEncoding)
        .build();

      expect(result.encoding).toEqual({
        image: firstEncoding,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new MediaTypeBuilder();
      const encodingObject: EncodingObject = { contentType: "text/plain" };
      const returnValue = builder.addEncoding("text", encodingObject);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addExtension", () => {
    it("应该添加扩展字段", () => {
      const builder = new MediaTypeBuilder();
      const extensionValue = { customProperty: "customValue" };
      const result = builder.addExtension("x-custom", extensionValue).build();

      expect(result["x-custom"]).toEqual(extensionValue);
    });

    it("应该支持添加多个扩展字段", () => {
      const builder = new MediaTypeBuilder();
      const result = builder
        .addExtension("x-version", "1.0")
        .addExtension("x-deprecated", true)
        .build();

      expect(result["x-version"]).toBe("1.0");
      expect(result["x-deprecated"]).toBe(true);
    });

    it("不应该重复添加相同键的扩展字段", () => {
      const builder = new MediaTypeBuilder();
      const result = builder
        .addExtension("x-test", "first")
        .addExtension("x-test", "second")
        .build();

      expect(result["x-test"]).toBe("first");
    });

    it("应该支持链式调用", () => {
      const builder = new MediaTypeBuilder();
      const returnValue = builder.addExtension("x-test", "value");

      expect(returnValue).toBe(builder);
    });
  });
});
