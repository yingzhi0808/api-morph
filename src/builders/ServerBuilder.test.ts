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
  });

  describe("setUrl", () => {
    it("应该设置服务器URL", () => {
      const builder = new ServerBuilder();
      const result = builder.setUrl("https://api.example.com").build();

      expect(result).toEqual({
        url: "https://api.example.com",
      });
    });

    it("应该支持相对URL", () => {
      const builder = new ServerBuilder();
      const result = builder.setUrl("/api/v1").build();

      expect(result).toEqual({
        url: "/api/v1",
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

    it("应该支持复杂对象作为扩展字段值", () => {
      const builder = new ServerBuilder();
      const result = builder
        .addExtension("x-metadata", {
          team: "api-team",
          contact: "api@example.com",
          tags: ["production", "v1"],
        })
        .build();

      expect(result).toEqual({
        url: "",
        "x-metadata": {
          team: "api-team",
          contact: "api@example.com",
          tags: ["production", "v1"],
        },
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

  describe("复杂场景测试", () => {
    it("应该支持完整的服务器配置", () => {
      const builder = new ServerBuilder();
      const result = builder
        .setUrl("https://{environment}.api.example.com/{version}")
        .setDescription("生产环境API服务器")
        .addVariable("environment", {
          default: "prod",
          enum: ["dev", "test", "prod"],
          description: "部署环境",
        })
        .addVariable("version", {
          default: "v1",
          enum: ["v1", "v2"],
          description: "API版本",
        })
        .addExtension("x-region", "us-east-1")
        .addExtension("x-load-balancer", true)
        .build();

      expect(result).toEqual({
        url: "https://{environment}.api.example.com/{version}",
        description: "生产环境API服务器",
        variables: {
          environment: {
            default: "prod",
            enum: ["dev", "test", "prod"],
            description: "部署环境",
          },
          version: {
            default: "v1",
            enum: ["v1", "v2"],
            description: "API版本",
          },
        },
        "x-region": "us-east-1",
        "x-load-balancer": true,
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

      expect(result1).not.toBe(result2);
    });

    it("应该支持覆盖已设置的值", () => {
      const builder = new ServerBuilder();
      const result = builder
        .setUrl("https://old.example.com")
        .setDescription("旧描述")
        .addVariable("new", { default: "new" })
        .addExtension("x-old", "old")
        .setUrl("https://new.example.com")
        .setDescription("新描述")
        .addExtension("x-new", "new")
        .build();

      expect(result).toEqual({
        url: "https://new.example.com",
        description: "新描述",
        variables: {
          new: { default: "new" },
        },
        "x-old": "old",
        "x-new": "new",
      });
    });

    it("应该正确处理带模板变量的URL", () => {
      const builder = new ServerBuilder();
      const result = builder
        .setUrl("https://{host}:{port}/api/{version}")
        .addVariable("host", {
          default: "api.example.com",
          description: "服务器主机名",
        })
        .addVariable("port", {
          default: "443",
          enum: ["80", "443", "8080"],
          description: "端口号",
        })
        .addVariable("version", {
          default: "v1",
          description: "API版本",
        })
        .build();

      expect(result).toEqual({
        url: "https://{host}:{port}/api/{version}",
        variables: {
          host: {
            default: "api.example.com",
            description: "服务器主机名",
          },
          port: {
            default: "443",
            enum: ["80", "443", "8080"],
            description: "端口号",
          },
          version: {
            default: "v1",
            description: "API版本",
          },
        },
      });
    });
  });
});
