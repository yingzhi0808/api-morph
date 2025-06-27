import { describe, expect, it, vi } from "vitest";
import { OpenAPIBuilder } from "@/builders/OpenAPIBuilder";
import type { OpenAPIObject } from "@/types/openapi";
import { type GenerateDocumentOptions, generateDocument } from "./document";

vi.mock("ts-morph", async () => {
  const { Project } = await vi.importActual<typeof import("ts-morph")>("ts-morph");
  return {
    Project: vi.fn().mockImplementation((options) => {
      return new Project({
        ...options,
        useInMemoryFileSystem: true,
        tsConfigFilePath: undefined,
      });
    }),
  };
});

describe("generateDocument", () => {
  describe("使用 OpenAPIObject", () => {
    it("应该正确处理完整的 OpenAPIObject", async () => {
      const config: OpenAPIObject = {
        openapi: "3.1.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
      };

      const options: GenerateDocumentOptions = {
        parserOptions: {
          include: [], // 不包含任何文件，测试空项目
        },
      };

      const result = await generateDocument(config, options);

      expect(result.info.title).toBe("Test API");
      expect(result.info.version).toBe("1.0.0");
      expect(result.openapi).toBe("3.1.0");
      expect(result.paths).toBeUndefined();
    });

    it("应该正确处理缺少字段的 OpenAPIObject", async () => {
      const config: OpenAPIObject = {
        // 缺少 openapi 字段
        info: {
          title: "Incomplete API",
          version: "2.0.0",
        },
      } as OpenAPIObject;

      const options: GenerateDocumentOptions = {
        parserOptions: {
          include: [], // 不包含任何文件
        },
      };

      const result = await generateDocument(config, options);

      expect(result.info.title).toBe("Incomplete API");
      expect(result.info.version).toBe("2.0.0");
      expect(result.openapi).toBe("3.1.0"); // 应该使用默认值
    });

    it("应该正确处理完全空的 OpenAPIObject", async () => {
      const config: Partial<OpenAPIObject> = {};
      const options: GenerateDocumentOptions = {
        parserOptions: {
          include: [], // 不包含任何文件
        },
      };

      const result = await generateDocument(config, options);

      expect(result.openapi).toBe("3.1.0"); // 默认值
      expect(result.info.title).toBe(""); // 默认值
      expect(result.info.version).toBe("1.0.0"); // 默认值
    });
  });

  describe("使用 OpenAPIBuilder 实例", () => {
    it("应该正确处理 OpenAPIBuilder 实例", async () => {
      const openAPIBuilder = new OpenAPIBuilder({
        openapi: "3.1.0",
        info: { title: "Builder API", version: "3.0.0" },
      })
        .setDescription("使用 Builder 创建的API")
        .addTag({ name: "users", description: "用户管理" })
        .addServer({
          url: "https://builder-api.example.com",
          description: "Builder服务器",
        });

      const options: GenerateDocumentOptions = {
        parserOptions: {
          include: [], // 不包含任何文件
        },
      };

      const result = await generateDocument(openAPIBuilder, options);

      expect(result.info.title).toBe("Builder API");
      expect(result.info.version).toBe("3.0.0");
      expect(result.info.description).toBe("使用 Builder 创建的API");
      expect(result.tags).toHaveLength(1);
      expect(result.tags?.[0]).toEqual({
        name: "users",
        description: "用户管理",
      });
      expect(result.servers).toHaveLength(1);
      expect(result.servers?.[0]).toEqual({
        url: "https://builder-api.example.com",
        description: "Builder服务器",
      });
      expect(result.paths).toBeUndefined();
    });

    it("应该正确处理预配置的复杂 OpenAPIBuilder", async () => {
      const openAPIBuilder = new OpenAPIBuilder({
        openapi: "3.1.0",
        info: { title: "Auth API", version: "1.0.0" },
      })
        .setContact({
          name: "Auth Team",
          email: "auth@example.com",
        })
        .setLicense({
          name: "Apache 2.0",
          url: "https://www.apache.org/licenses/LICENSE-2.0",
        })
        .addSecuritySchemeToComponents("bearerAuth", {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        })
        .addSecurity({ bearerAuth: [] });

      const options: GenerateDocumentOptions = {
        parserOptions: {
          include: [], // 不包含任何文件
        },
      };

      const result = await generateDocument(openAPIBuilder, options);

      expect(result.info.title).toBe("Auth API");
      expect(result.components?.securitySchemes).toHaveProperty("bearerAuth");
      expect(result.security).toEqual([{ bearerAuth: [] }]);
      expect(result.paths).toBeUndefined();
    });
  });

  describe("解析器选项", () => {
    it("应该正确处理自定义 tsConfigPath", async () => {
      const config: OpenAPIObject = {
        openapi: "3.1.0",
        info: {
          title: "Custom Config API",
          version: "1.0.0",
        },
      };

      const options: GenerateDocumentOptions = {
        tsConfigFilePath: undefined, // 使用默认配置
        parserOptions: {
          include: [], // 不包含任何文件
        },
      };

      const result = await generateDocument(config, options);

      expect(result.info.title).toBe("Custom Config API");
      expect(result.openapi).toBe("3.1.0");
    });

    it("应该正确处理解析器选项", async () => {
      const config: OpenAPIObject = {
        openapi: "3.1.0",
        info: {
          title: "Parser Options API",
          version: "1.0.0",
        },
      };

      const options: GenerateDocumentOptions = {
        parserOptions: {
          include: [], // 不包含任何文件
          exclude: ["**/*.test.ts"],
        },
      };

      const result = await generateDocument(config, options);

      expect(result.info.title).toBe("Parser Options API");
      expect(result.paths).toBeUndefined();
    });
  });
});
