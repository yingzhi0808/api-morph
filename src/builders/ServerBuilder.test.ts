import { describe, expect, it } from "vitest";
import { ServerBuilder } from "./ServerBuilder";

describe("ServerBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建默认的服务器对象", () => {
      const builder = new ServerBuilder();
      const result = builder.build();

      expect(result).toEqual({
        url: "",
      });
    });

    it("多次调用 build 应该返回不同的对象引用", () => {
      const builder = new ServerBuilder();
      builder
        .setUrl("https://api.example.com")
        .setDescription("服务器")
        .addVariable("version", { default: "v1" });

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe("setUrl", () => {
    it("应该设置服务器URL", () => {
      const builder = new ServerBuilder();
      const result = builder.setUrl("https://api.example.com").build();

      expect(result).toEqual({
        url: "https://api.example.com",
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ServerBuilder();
      const returnValue = builder.setUrl("https://api.example.com");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setDescription", () => {
    it("应该设置服务器描述", () => {
      const builder = new ServerBuilder();
      const result = builder.setDescription("生产环境服务器").build();

      expect(result).toEqual({
        url: "",
        description: "生产环境服务器",
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ServerBuilder();
      const returnValue = builder.setDescription("描述");

      expect(returnValue).toBe(builder);
    });
  });

  describe("addVariable", () => {
    it("应该添加单个服务器变量", () => {
      const builder = new ServerBuilder();
      const result = builder
        .addVariable("version", {
          default: "v1",
          description: "API版本",
        })
        .build();

      expect(result).toEqual({
        url: "",
        variables: {
          version: {
            default: "v1",
            description: "API版本",
          },
        },
      });
    });

    it("应该添加多个服务器变量", () => {
      const builder = new ServerBuilder();
      const result = builder
        .addVariable("version", {
          default: "v1",
          enum: ["v1", "v2"],
          description: "API版本",
        })
        .addVariable("environment", {
          default: "prod",
          enum: ["dev", "test", "prod"],
          description: "环境",
        })
        .build();

      expect(result).toEqual({
        url: "",
        variables: {
          version: {
            default: "v1",
            enum: ["v1", "v2"],
            description: "API版本",
          },
          environment: {
            default: "prod",
            enum: ["dev", "test", "prod"],
            description: "环境",
          },
        },
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ServerBuilder();
      const returnValue = builder.addVariable("version", { default: "v1" });

      expect(returnValue).toBe(builder);
    });

    it("不应该覆盖已存在的变量", () => {
      const builder = new ServerBuilder();
      const result = builder
        .addVariable("version", { default: "v1", description: "第一次添加" })
        .addVariable("version", { default: "v2", description: "第二次添加" })
        .build();

      expect(result).toEqual({
        url: "",
        variables: {
          version: {
            default: "v1",
            description: "第一次添加",
          },
        },
      });
    });
  });

  describe("addExtension", () => {
    it("应该添加扩展字段", () => {
      const builder = new ServerBuilder();
      const result = builder.addExtension("x-custom-field", "custom-value").build();

      expect(result).toEqual({
        url: "",
        "x-custom-field": "custom-value",
      });
    });

    it("应该添加多个扩展字段", () => {
      const builder = new ServerBuilder();
      const result = builder
        .addExtension("x-region", "us-east-1")
        .addExtension("x-load-balancer", true)
        .addExtension("x-timeout", 30000)
        .build();

      expect(result).toEqual({
        url: "",
        "x-region": "us-east-1",
        "x-load-balancer": true,
        "x-timeout": 30000,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ServerBuilder();
      const returnValue = builder.addExtension("x-test", "value");

      expect(returnValue).toBe(builder);
    });

    it("不应该覆盖已存在的扩展字段", () => {
      const builder = new ServerBuilder();
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
