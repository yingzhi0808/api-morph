import { describe, expect, it } from "vitest";
import { ExternalDocsBuilder } from "./ExternalDocsBuilder";

describe("ExternalDocsBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建默认的外部文档对象", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder.build();

      expect(result).toEqual({
        url: "",
      });
    });

    it("多次调用 build 应该返回不同的对象引用", () => {
      const builder = new ExternalDocsBuilder();
      builder.setUrl("https://api.docs.com").setDescription("API文档");

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe("setUrl", () => {
    it("应该设置外部文档URL", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder.setUrl("https://docs.example.com").build();

      expect(result).toEqual({
        url: "https://docs.example.com",
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ExternalDocsBuilder();
      const returnValue = builder.setUrl("https://docs.example.com");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setDescription", () => {
    it("应该设置外部文档描述", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder.setDescription("详细的API文档").build();

      expect(result).toEqual({
        url: "",
        description: "详细的API文档",
      });
    });

    it("应该支持多行描述", () => {
      const builder = new ExternalDocsBuilder();
      const description = "详细的API文档\n包含完整的接口说明\n以及示例代码";
      const result = builder.setDescription(description).build();

      expect(result).toEqual({
        url: "",
        description,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ExternalDocsBuilder();
      const returnValue = builder.setDescription("描述");

      expect(returnValue).toBe(builder);
    });
  });

  describe("addExtension", () => {
    it("应该添加扩展字段", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder.addExtension("x-custom-field", "custom-value").build();

      expect(result).toEqual({
        url: "",
        "x-custom-field": "custom-value",
      });
    });

    it("应该添加多个扩展字段", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder
        .addExtension("x-version", "v1.0")
        .addExtension("x-format", "markdown")
        .addExtension("x-language", "zh-CN")
        .build();

      expect(result).toEqual({
        url: "",
        "x-version": "v1.0",
        "x-format": "markdown",
        "x-language": "zh-CN",
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ExternalDocsBuilder();
      const returnValue = builder.addExtension("x-test", "value");

      expect(returnValue).toBe(builder);
    });

    it("不应该覆盖已存在的扩展字段", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder
        .addExtension("x-custom", "原始值")
        .addExtension("x-custom", "新值")
        .build();

      expect(result).toEqual({
        url: "",
        "x-custom": "原始值",
      });
    });
  });
});
