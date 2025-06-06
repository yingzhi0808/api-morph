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
  });

  describe("setUrl", () => {
    it("应该设置外部文档URL", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder.setUrl("https://docs.example.com").build();

      expect(result).toEqual({
        url: "https://docs.example.com",
      });
    });

    it("应该支持相对URL", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder.setUrl("/docs/api").build();

      expect(result).toEqual({
        url: "/docs/api",
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ExternalDocsBuilder();
      const returnValue = builder.setUrl("https://docs.example.com");

      expect(returnValue).toBe(builder);
    });

    it("应该覆盖之前设置的URL", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder
        .setUrl("https://old-docs.example.com")
        .setUrl("https://new-docs.example.com")
        .build();

      expect(result).toEqual({
        url: "https://new-docs.example.com",
      });
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

    it("应该覆盖之前设置的描述", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder.setDescription("旧描述").setDescription("新描述").build();

      expect(result).toEqual({
        url: "",
        description: "新描述",
      });
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

    it("应该支持复杂对象作为扩展字段值", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder
        .addExtension("x-metadata", {
          author: "API Team",
          lastUpdated: "2024-01-01",
          tags: ["api", "documentation"],
          sections: {
            authentication: "/auth",
            examples: "/examples",
          },
        })
        .build();

      expect(result).toEqual({
        url: "",
        "x-metadata": {
          author: "API Team",
          lastUpdated: "2024-01-01",
          tags: ["api", "documentation"],
          sections: {
            authentication: "/auth",
            examples: "/examples",
          },
        },
      });
    });

    it("应该支持不同类型的扩展字段值", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder
        .addExtension("x-string", "字符串值")
        .addExtension("x-number", 42)
        .addExtension("x-boolean", true)
        .addExtension("x-array", ["item1", "item2", "item3"])
        .addExtension("x-null", null)
        .build();

      expect(result).toEqual({
        url: "",
        "x-string": "字符串值",
        "x-number": 42,
        "x-boolean": true,
        "x-array": ["item1", "item2", "item3"],
        "x-null": null,
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

  describe("综合测试", () => {
    it("应该支持完整的外部文档配置", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder
        .setUrl("https://docs.example.com/api")
        .setDescription("完整的API文档，包含所有接口的详细说明")
        .addExtension("x-version", "v2.0")
        .addExtension("x-format", "openapi")
        .addExtension("x-language", "zh-CN")
        .addExtension("x-metadata", {
          team: "API Team",
          contact: "api@example.com",
        })
        .build();

      expect(result).toEqual({
        url: "https://docs.example.com/api",
        description: "完整的API文档，包含所有接口的详细说明",
        "x-version": "v2.0",
        "x-format": "openapi",
        "x-language": "zh-CN",
        "x-metadata": {
          team: "API Team",
          contact: "api@example.com",
        },
      });
    });

    it("应该支持链式调用的任意顺序", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder
        .addExtension("x-first", "first")
        .setDescription("描述")
        .addExtension("x-second", "second")
        .setUrl("https://example.com")
        .addExtension("x-third", "third")
        .build();

      expect(result).toEqual({
        url: "https://example.com",
        description: "描述",
        "x-first": "first",
        "x-second": "second",
        "x-third": "third",
      });
    });

    it("多次调用 build 应该返回不同的对象引用", () => {
      const builder = new ExternalDocsBuilder();
      builder.setUrl("https://api.docs.com").setDescription("API文档");

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).not.toBe(result2);
    });
  });

  describe("边界情况", () => {
    it("应该处理空字符串URL", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder.setUrl("").build();

      expect(result).toEqual({
        url: "",
      });
    });

    it("应该处理空字符串描述", () => {
      const builder = new ExternalDocsBuilder();
      const result = builder.setDescription("").build();

      expect(result).toEqual({
        url: "",
        description: "",
      });
    });

    it("应该处理包含特殊字符的URL", () => {
      const builder = new ExternalDocsBuilder();
      const specialUrl = "https://docs.example.com/api?version=v1&format=json#section";
      const result = builder.setUrl(specialUrl).build();

      expect(result).toEqual({
        url: specialUrl,
      });
    });

    it("应该处理包含Unicode字符的描述", () => {
      const builder = new ExternalDocsBuilder();
      const unicodeDescription = "API文档 📚 包含详细说明 🚀";
      const result = builder.setDescription(unicodeDescription).build();

      expect(result).toEqual({
        url: "",
        description: unicodeDescription,
      });
    });
  });
});
