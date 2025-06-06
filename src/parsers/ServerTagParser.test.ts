import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { JSDocTagName } from "@/constants";
import { ServerTagParser } from "./ServerTagParser";

describe("ServerTagParser", () => {
  let parser: ServerTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new ServerTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual([JSDocTagName.SERVER]);
    });
  });

  describe("parse", () => {
    describe("混合格式解析", () => {
      it("应该正确解析 URL + 变量配置", async () => {
        const tag = createJSDocTag(`@server https://api.example.com
        variables:
          version:
            default: v1
            enum: [v1, v2]`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
            variables: {
              version: {
                default: "v1",
                enum: ["v1", "v2"],
              },
            },
          },
        });
      });

      it("应该正确解析 URL + 描述 + 变量配置", async () => {
        const tag = createJSDocTag(`@server https://api.example.com 生产环境服务器
        variables:
          version:
            default: v1
            description: API版本`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
            description: "生产环境服务器",
            variables: {
              version: {
                default: "v1",
                description: "API版本",
              },
            },
          },
        });
      });

      it("应该正确解析 URL + 扩展字段配置", async () => {
        const tag = createJSDocTag(`@server https://api.example.com
        x-environment: production
        x-region: us-east-1`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
            "x-environment": "production",
            "x-region": "us-east-1",
          },
        });
      });

      it("应该正确解析 URL + 描述 + 变量 + 扩展字段的完整配置", async () => {
        const tag = createJSDocTag(`@server https://api.example.com 生产环境API服务器
        variables:
          version:
            default: v1
            enum: [v1, v2]
            description: API版本号
          environment:
            default: prod
            enum: [dev, staging, prod]
        x-environment: production
        x-region: us-east-1
        x-load-balancer: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
            description: "生产环境API服务器",
            variables: {
              version: {
                default: "v1",
                enum: ["v1", "v2"],
                description: "API版本号",
              },
              environment: {
                default: "prod",
                enum: ["dev", "staging", "prod"],
              },
            },
            "x-environment": "production",
            "x-region": "us-east-1",
            "x-load-balancer": true,
          },
        });
      });

      it("应该正确解析只有扩展字段的配置", async () => {
        const tag = createJSDocTag(`@server https://api.example.com
        x-provider: aws
        x-version: "2.0"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
            "x-provider": "aws",
            "x-version": "2.0",
          },
        });
      });

      it("应该正确解析多词描述", async () => {
        const tag = createJSDocTag(`@server https://api.example.com 这是一个多词的服务器描述
        x-provider: aws`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
            description: "这是一个多词的服务器描述",
            "x-provider": "aws",
          },
        });
      });
    });

    describe("错误处理", () => {
      it("应该在没有参数且没有 YAML 时抛出错误", async () => {
        const tag = createJSDocTag("@server");
        await expect(parser.parse(tag)).rejects.toThrow(/@server 标签 url 不能为空/);
      });

      it("应该在没有 URL 时抛出错误", async () => {
        const tag = createJSDocTag(`@server
        x-provider: "test"`);
        await expect(parser.parse(tag)).rejects.toThrow(/@server 标签 url 不能为空/);
      });

      it("应该在没有 YAML 参数时抛出错误", async () => {
        const tag = createJSDocTag("@server https://api.example.com");
        await expect(parser.parse(tag)).rejects.toThrow(/@server 标签必须包含 YAML 参数/);
      });

      it("应该在 URL 格式无效时抛出错误", async () => {
        const tag = createJSDocTag(`@server invalid-url
        x-provider: "test"`);
        await expect(parser.parse(tag)).rejects.toThrow(
          /@server 标签提供的 url 格式无效: "invalid-url"/,
        );
      });

      it("应该在相对 URL 时抛出错误", async () => {
        const tag = createJSDocTag(`@server /api/v1
        x-provider: "test"`);
        await expect(parser.parse(tag)).rejects.toThrow(
          /@server 标签提供的 url 格式无效: "\/api\/v1"/,
        );
      });

      it("应该在没有协议的 URL 时抛出错误", async () => {
        const tag = createJSDocTag(`@server api.example.com
        x-provider: "test"`);
        await expect(parser.parse(tag)).rejects.toThrow(
          /@server 标签提供的 url 格式无效: "api.example.com"/,
        );
      });
    });

    describe("边界情况", () => {
      it("应该正确处理包含端口的URL", async () => {
        const tag = createJSDocTag(`@server https://api.example.com:8080
        x-provider: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com:8080",
            "x-provider": "test",
          },
        });
      });

      it("应该正确处理包含路径的URL", async () => {
        const tag = createJSDocTag(`@server https://api.example.com/v1
        x-provider: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com/v1",
            "x-provider": "test",
          },
        });
      });

      it("应该正确处理带引号的URL", async () => {
        const tag = createJSDocTag(`@server "https://api.example.com"
        x-provider: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
            "x-provider": "test",
          },
        });
      });

      it("应该正确处理 IPv4 地址", async () => {
        const tag = createJSDocTag(`@server http://192.168.1.100:8080
        x-provider: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "http://192.168.1.100:8080",
            "x-provider": "test",
          },
        });
      });

      it("应该正确处理 IPv6 地址", async () => {
        const tag = createJSDocTag(`@server http://[::1]:8080
        x-provider: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "http://[::1]:8080",
            "x-provider": "test",
          },
        });
      });

      it("应该正确处理空的变量对象", async () => {
        const tag = createJSDocTag(`@server https://api.example.com
        variables: {}`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
          },
        });
      });

      it("应该忽略非扩展字段的无效字段", async () => {
        const tag = createJSDocTag(`@server https://api.example.com
        invalidField: "should be ignored"
        x-valid: "should be included"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
            "x-valid": "should be included",
          },
        });
      });

      it("应该正确处理复杂的变量配置", async () => {
        const tag = createJSDocTag(`@server https://api.example.com
        variables:
          protocol:
            default: https
            enum: [http, https]
            description: 协议类型
          host:
            default: api.example.com
            description: 服务器主机名
          port:
            default: 443
            description: 端口号`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
            variables: {
              protocol: {
                default: "https",
                enum: ["http", "https"],
                description: "协议类型",
              },
              host: {
                default: "api.example.com",
                description: "服务器主机名",
              },
              port: {
                default: 443,
                description: "端口号",
              },
            },
          },
        });
      });

      it("应该正确处理不同数据类型的扩展字段", async () => {
        const tag = createJSDocTag(`@server https://api.example.com
        x-timeout: 30000
        x-enabled: true
        x-version: 1.2
        x-custom: null
        x-tags: ["api", "production"]`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.example.com",
            "x-timeout": 30000,
            "x-enabled": true,
            "x-version": 1.2,
            "x-custom": null,
            "x-tags": ["api", "production"],
          },
        });
      });
    });

    describe("真实场景测试", () => {
      it("应该正确解析生产环境服务器配置", async () => {
        const tag = createJSDocTag(`@server https://api.production.com 生产环境API服务器
        variables:
          version:
            default: v1
            enum: [v1, v2]
            description: API版本
        x-environment: production
        x-region: us-east-1
        x-load-balancer: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://api.production.com",
            description: "生产环境API服务器",
            variables: {
              version: {
                default: "v1",
                enum: ["v1", "v2"],
                description: "API版本",
              },
            },
            "x-environment": "production",
            "x-region": "us-east-1",
            "x-load-balancer": true,
          },
        });
      });

      it("应该正确解析开发环境服务器配置", async () => {
        const tag = createJSDocTag(`@server http://localhost:3000 本地开发服务器
        variables:
          port:
            default: 3000
            description: 服务端口
        x-environment: development
        x-debug: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "http://localhost:3000",
            description: "本地开发服务器",
            variables: {
              port: {
                default: 3000,
                description: "服务端口",
              },
            },
            "x-environment": "development",
            "x-debug": true,
          },
        });
      });

      it("应该正确解析多环境服务器配置", async () => {
        const tag = createJSDocTag(`@server https://{environment}.api.example.com 多环境API服务器
        variables:
          environment:
            default: prod
            enum: [dev, staging, prod]
            description: 环境名称
          version:
            default: v1
            enum: [v1, v2, v3]
        x-multi-environment: true
        x-auto-scaling: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://{environment}.api.example.com",
            description: "多环境API服务器",
            variables: {
              environment: {
                default: "prod",
                enum: ["dev", "staging", "prod"],
                description: "环境名称",
              },
              version: {
                default: "v1",
                enum: ["v1", "v2", "v3"],
              },
            },
            "x-multi-environment": true,
            "x-auto-scaling": true,
          },
        });
      });

      it("应该正确解析微服务架构配置", async () => {
        const tag = createJSDocTag(`@server https://gateway.microservices.com/{service} 微服务网关
        variables:
          service:
            default: api
            enum: [api, auth, payment, notification]
            description: 微服务名称
          version:
            default: v1
            description: 服务版本
        x-architecture: microservices
        x-gateway: true
        x-service-discovery: consul`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          server: {
            url: "https://gateway.microservices.com/{service}",
            description: "微服务网关",
            variables: {
              service: {
                default: "api",
                enum: ["api", "auth", "payment", "notification"],
                description: "微服务名称",
              },
              version: {
                default: "v1",
                description: "服务版本",
              },
            },
            "x-architecture": "microservices",
            "x-gateway": true,
            "x-service-discovery": "consul",
          },
        });
      });
    });
  });
});
