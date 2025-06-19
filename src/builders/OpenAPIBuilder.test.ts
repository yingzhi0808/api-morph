import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import type {
  CallbackObject,
  ContactObject,
  ExampleObject,
  ExternalDocumentationObject,
  HeaderObject,
  LicenseObject,
  LinkObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
  ServerObject,
  TagObject,
} from "@/types";
import { OpenAPIBuilder } from "./OpenAPIBuilder";
import { PathItemBuilder } from "./PathItemBuilder";

describe("OpenAPIBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建带有默认值的 OpenAPI 文档", () => {
      const builder1 = new OpenAPIBuilder();
      const result1 = builder1.build();

      expect(result1).toEqual({
        openapi: "3.1.0",
        info: { title: "", version: "1.0.0" },
      });

      const builder2 = new OpenAPIBuilder({ openapi: "3.1.1" });
      const result2 = builder2.build();

      expect(result2).toEqual({
        openapi: "3.1.1",
        info: { title: "", version: "1.0.0" },
      });

      const builder3 = new OpenAPIBuilder({ info: { title: "Test API" } });
      const result3 = builder3.build();

      expect(result3).toEqual({
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
      });

      const builder4 = new OpenAPIBuilder({ info: { version: "1.1.0" } });
      const result4 = builder4.build();

      expect(result4).toEqual({
        openapi: "3.1.0",
        info: { title: "", version: "1.1.0" },
      });
    });

    it("应该在多次调用 build 方法时返回不同的对象引用", () => {
      const builder = new OpenAPIBuilder();
      builder.setOpenAPIVersion("3.1.1");

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe("setOpenAPIVersion", () => {
    it("应该正确设置 OpenAPI 版本", () => {
      const builder = new OpenAPIBuilder();
      const version = "3.1.0";
      const result = builder.setOpenAPIVersion(version).build();

      expect(result.openapi).toStrictEqual(version);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.setOpenAPIVersion("3.1.0");

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("setTitle", () => {
    it("应该正确设置 API 标题", () => {
      const builder = new OpenAPIBuilder();
      const title = "用户管理 API";
      const result = builder.setTitle(title).build();

      expect(result.info.title).toStrictEqual(title);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.setTitle("测试 API");

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("setSummary", () => {
    it("应该正确设置 API 摘要", () => {
      const builder = new OpenAPIBuilder();
      const summary = "这是一个用户管理系统的 REST API";
      const result = builder.setSummary(summary).build();

      expect(result.info.summary).toStrictEqual(summary);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.setSummary("测试摘要");

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("setDescription", () => {
    it("应该正确设置 API 描述", () => {
      const builder = new OpenAPIBuilder();
      const description = "该 API 提供完整的用户管理功能，包括注册、登录、信息修改等操作";
      const result = builder.setDescription(description).build();

      expect(result.info.description).toStrictEqual(description);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.setDescription("测试描述");

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("setTermsOfService", () => {
    it("应该正确设置服务条款链接", () => {
      const builder = new OpenAPIBuilder();
      const termsOfService = "https://example.com/terms";
      const result = builder.setTermsOfService(termsOfService).build();

      expect(result.info.termsOfService).toStrictEqual(termsOfService);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.setTermsOfService("https://test.com/terms");

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("setContact", () => {
    it("应该正确设置联系信息", () => {
      const builder = new OpenAPIBuilder();
      const contact: ContactObject = {
        name: "API 支持团队",
        url: "https://example.com/support",
        email: "support@example.com",
      };
      const result = builder.setContact(contact).build();

      expect(result.info.contact).toStrictEqual(contact);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const contact: ContactObject = {
        name: "测试团队",
      };
      const returnValue = builder.setContact(contact);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("setLicense", () => {
    it("应该正确设置许可证信息", () => {
      const builder = new OpenAPIBuilder();
      const license: LicenseObject = {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      };
      const result = builder.setLicense(license).build();

      expect(result.info.license).toStrictEqual(license);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const license: LicenseObject = {
        name: "Apache 2.0",
      };
      const returnValue = builder.setLicense(license);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("setVersion", () => {
    it("应该正确设置 API 版本", () => {
      const builder = new OpenAPIBuilder();
      const version = "2.1.0";
      const result = builder.setVersion(version).build();

      expect(result.info.version).toStrictEqual(version);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.setVersion("1.5.0");

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addInfoExtension", () => {
    it("应该添加有效的 info 扩展字段", () => {
      const builder = new OpenAPIBuilder();
      const extensionValue = { customInfoData: "test" };
      const result = builder.addInfoExtension("x-info-extension", extensionValue).build();

      expect(result.info["x-info-extension"]).toStrictEqual(extensionValue);
    });

    it("应该支持添加多个 info 扩展字段", () => {
      const builder = new OpenAPIBuilder();
      const extension1 = "value1";
      const extension2 = { data: "value2" };
      const result = builder
        .addInfoExtension("x-info-1", extension1)
        .addInfoExtension("x-info-2", extension2)
        .build();

      expect(result.info["x-info-1"]).toStrictEqual(extension1);
      expect(result.info["x-info-2"]).toStrictEqual(extension2);
    });

    it("不应该重复添加相同的 info 扩展字段", () => {
      const builder = new OpenAPIBuilder();
      const firstValue = "first";
      const secondValue = "second";
      const result = builder
        .addInfoExtension("x-duplicate", firstValue)
        .addInfoExtension("x-duplicate", secondValue)
        .build();

      expect(result.info["x-duplicate"]).toStrictEqual(firstValue);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.addInfoExtension("x-test", "value");

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("setJsonSchemaDialect", () => {
    it("应该正确设置 JSON Schema Dialect", () => {
      const builder = new OpenAPIBuilder();
      const dialect = "https://json-schema.org/draft/2020-12/schema";
      const result = builder.setJsonSchemaDialect(dialect).build();

      expect(result.jsonSchemaDialect).toStrictEqual(dialect);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.setJsonSchemaDialect(
        "https://json-schema.org/draft/2019-09/schema",
      );

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addServer", () => {
    it("应该添加单个服务器", () => {
      const builder = new OpenAPIBuilder();
      const server: ServerObject = {
        url: "https://api.example.com",
        description: "生产环境服务器",
      };
      const result = builder.addServer(server).build();

      expect(result.servers).toEqual([server]);
    });

    it("应该添加多个服务器", () => {
      const builder = new OpenAPIBuilder();
      const server1: ServerObject = {
        url: "https://api.example.com",
        description: "生产环境",
      };
      const server2: ServerObject = {
        url: "https://staging-api.example.com",
        description: "测试环境",
      };
      const result = builder.addServer(server1).addServer(server2).build();

      expect(result.servers).toEqual([server1, server2]);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const server: ServerObject = {
        url: "https://test.example.com",
      };
      const returnValue = builder.addServer(server);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addPathItem", () => {
    it("应该添加单个路径项", () => {
      const builder = new OpenAPIBuilder();
      const pathItem: PathItemObject = {
        summary: "用户操作",
        get: {
          responses: { "200": { description: "成功" } },
        },
      };
      const result = builder.addPathItem("/users", pathItem).build();

      expect(result.paths).toEqual({
        "/users": pathItem,
      });
    });

    it("应该添加多个不同的路径项", () => {
      const builder = new OpenAPIBuilder();
      const usersPath: PathItemObject = {
        get: { responses: { "200": { description: "获取用户列表" } } },
      };
      const userPath: PathItemObject = {
        get: { responses: { "200": { description: "获取用户详情" } } },
      };
      const result = builder
        .addPathItem("/users", usersPath)
        .addPathItem("/users/{id}", userPath)
        .build();

      expect(result.paths).toEqual({
        "/users": usersPath,
        "/users/{id}": userPath,
      });
    });

    it("不应该重复添加相同路径的路径项", () => {
      const builder = new OpenAPIBuilder();
      const firstPathItem: PathItemObject = {
        summary: "第一个路径项",
      };
      const secondPathItem: PathItemObject = {
        summary: "第二个路径项",
      };
      const result = builder
        .addPathItem("/users", firstPathItem)
        .addPathItem("/users", secondPathItem)
        .build();

      expect(result.paths).toEqual({
        "/users": firstPathItem,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const pathItem: PathItemObject = {};
      const returnValue = builder.addPathItem("/test", pathItem);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addPathItemFromBuilder", () => {
    it("应该使用 PathItemBuilder 添加路径项", () => {
      const builder = new OpenAPIBuilder();
      const pathItemBuilder = new PathItemBuilder()
        .setSummary("用户管理")
        .setDescription("用户相关操作");
      const result = builder.addPathItemFromBuilder("/users", pathItemBuilder).build();

      expect(result.paths?.["/users"]).toEqual(pathItemBuilder.build());
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const pathItemBuilder = new PathItemBuilder();
      const returnValue = builder.addPathItemFromBuilder("/test", pathItemBuilder);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addPathsExtension", () => {
    it("应该添加有效的 paths 扩展字段", () => {
      const builder = new OpenAPIBuilder();
      const extensionValue = { pathsData: "test" };
      const result = builder.addPathsExtension("x-paths-extension", extensionValue).build();

      expect(result.paths?.["x-paths-extension"]).toStrictEqual(extensionValue);
    });

    it("应该支持添加多个 paths 扩展字段", () => {
      const builder = new OpenAPIBuilder();
      const extension1 = "value1";
      const extension2 = { data: "value2" };
      const result = builder
        .addPathsExtension("x-paths-1", extension1)
        .addPathsExtension("x-paths-2", extension2)
        .build();

      expect(result.paths?.["x-paths-1"]).toStrictEqual(extension1);
      expect(result.paths?.["x-paths-2"]).toStrictEqual(extension2);
    });

    it("不应该重复添加相同的 paths 扩展字段", () => {
      const builder = new OpenAPIBuilder();
      const firstValue = "first";
      const secondValue = "second";
      const result = builder
        .addPathsExtension("x-duplicate", firstValue)
        .addPathsExtension("x-duplicate", secondValue)
        .build();

      expect(result.paths?.["x-duplicate"]).toStrictEqual(firstValue);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.addPathsExtension("x-test", "value");

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addWebhook", () => {
    it("应该添加单个 Webhook", () => {
      const builder = new OpenAPIBuilder();
      const webhook: PathItemObject = {
        post: {
          responses: { "200": { description: "Webhook 处理成功" } },
        },
      };
      const result = builder.addWebhook("userCreated", webhook).build();

      expect(result.webhooks).toEqual({
        userCreated: webhook,
      });
    });

    it("应该添加多个不同的 Webhook", () => {
      const builder = new OpenAPIBuilder();
      const webhook1: PathItemObject = {
        post: { responses: { "200": { description: "用户创建" } } },
      };
      const webhook2: PathItemObject = {
        post: { responses: { "200": { description: "用户更新" } } },
      };
      const result = builder
        .addWebhook("userCreated", webhook1)
        .addWebhook("userUpdated", webhook2)
        .build();

      expect(result.webhooks).toEqual({
        userCreated: webhook1,
        userUpdated: webhook2,
      });
    });

    it("不应该重复添加相同名称的 Webhook", () => {
      const builder = new OpenAPIBuilder();
      const firstWebhook: PathItemObject = {
        summary: "第一个 Webhook",
      };
      const secondWebhook: PathItemObject = {
        summary: "第二个 Webhook",
      };
      const result = builder
        .addWebhook("userEvent", firstWebhook)
        .addWebhook("userEvent", secondWebhook)
        .build();

      expect(result.webhooks).toEqual({
        userEvent: firstWebhook,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const webhook: PathItemObject = {};
      const returnValue = builder.addWebhook("test", webhook);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addSecurity", () => {
    it("应该添加单个安全要求", () => {
      const builder = new OpenAPIBuilder();
      const securityRequirement: SecurityRequirementObject = {
        bearerAuth: [],
      };
      const result = builder.addSecurity(securityRequirement).build();

      expect(result.security).toEqual([securityRequirement]);
    });

    it("应该添加多个安全要求", () => {
      const builder = new OpenAPIBuilder();
      const security1: SecurityRequirementObject = {
        bearerAuth: [],
      };
      const security2: SecurityRequirementObject = {
        apiKey: [],
      };
      const result = builder.addSecurity(security1).addSecurity(security2).build();

      expect(result.security).toEqual([security1, security2]);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const securityRequirement: SecurityRequirementObject = {
        bearerAuth: [],
      };
      const returnValue = builder.addSecurity(securityRequirement);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addTag", () => {
    it("应该添加单个标签", () => {
      const builder = new OpenAPIBuilder();
      const tag: TagObject = {
        name: "users",
        description: "用户管理相关接口",
      };
      const result = builder.addTag(tag).build();

      expect(result.tags).toEqual([tag]);
    });

    it("应该添加多个不同的标签", () => {
      const builder = new OpenAPIBuilder();
      const tag1: TagObject = {
        name: "users",
        description: "用户管理",
      };
      const tag2: TagObject = {
        name: "auth",
        description: "认证相关",
      };
      const result = builder.addTag(tag1).addTag(tag2).build();

      expect(result.tags).toEqual([tag1, tag2]);
    });

    it("不应该重复添加相同名称的标签", () => {
      const builder = new OpenAPIBuilder();
      const tag1: TagObject = {
        name: "users",
        description: "第一个标签",
      };
      const tag2: TagObject = {
        name: "users",
        description: "第二个标签",
      };
      const result = builder.addTag(tag1).addTag(tag2).build();

      expect(result.tags).toEqual([tag1]);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const tag: TagObject = {
        name: "test",
      };
      const returnValue = builder.addTag(tag);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("setExternalDocs", () => {
    it("应该正确设置外部文档", () => {
      const builder = new OpenAPIBuilder();
      const externalDocs: ExternalDocumentationObject = {
        description: "更多信息请参考外部文档",
        url: "https://example.com/docs",
      };
      const result = builder.setExternalDocs(externalDocs).build();

      expect(result.externalDocs).toStrictEqual(externalDocs);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const externalDocs: ExternalDocumentationObject = {
        url: "https://example.com",
      };
      const returnValue = builder.setExternalDocs(externalDocs);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addExtension", () => {
    it("应该添加有效的扩展字段", () => {
      const builder = new OpenAPIBuilder();
      const extensionValue = { customData: "test" };
      const result = builder.addExtension("x-custom-extension", extensionValue).build();

      expect(result["x-custom-extension"]).toStrictEqual(extensionValue);
    });

    it("应该支持添加多个扩展字段", () => {
      const builder = new OpenAPIBuilder();
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
      const builder = new OpenAPIBuilder();
      const firstValue = "first";
      const secondValue = "second";
      const result = builder
        .addExtension("x-duplicate", firstValue)
        .addExtension("x-duplicate", secondValue)
        .build();

      expect(result["x-duplicate"]).toStrictEqual(firstValue);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.addExtension("x-test", "value");

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addSchemaToComponents", () => {
    it("应该添加对象类型的全局 Schema", () => {
      const builder = new OpenAPIBuilder();
      const schema: SchemaObject = {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      };
      const result = builder.addSchemaToComponents("User", schema).build();

      expect(result.components?.schemas?.User).toStrictEqual(schema);
    });

    it("应该添加布尔类型的全局 Schema", () => {
      const builder = new OpenAPIBuilder();
      const schema = true;
      const result = builder.addSchemaToComponents("AnySchema", schema).build();

      expect(result.components?.schemas?.AnySchema).toStrictEqual(schema);
    });

    it("应该添加多个不同的全局 Schema", () => {
      const builder = new OpenAPIBuilder();
      const userSchema: SchemaObject = { type: "object" };
      const productSchema: SchemaObject = { type: "object" };
      const result = builder
        .addSchemaToComponents("User", userSchema)
        .addSchemaToComponents("Product", productSchema)
        .build();

      expect(result.components?.schemas?.User).toStrictEqual(userSchema);
      expect(result.components?.schemas?.Product).toStrictEqual(productSchema);
    });

    it("不应该重复添加相同名称的全局 Schema", () => {
      const builder = new OpenAPIBuilder();
      const firstSchema: SchemaObject = { type: "string" };
      const secondSchema: SchemaObject = { type: "number" };
      const result = builder
        .addSchemaToComponents("Test", firstSchema)
        .addSchemaToComponents("Test", secondSchema)
        .build();

      expect(result.components?.schemas?.Test).toStrictEqual(firstSchema);
    });

    it("应该正确添加 Zod schema", () => {
      const builder = new OpenAPIBuilder();
      const zodSchema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const result = builder.addSchemaToComponents("User", zodSchema).build();

      expect(result.components?.schemas?.User).toEqual({
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
      const builder = new OpenAPIBuilder();
      const schema: SchemaObject = { type: "object" };
      const returnValue = builder.addSchemaToComponents("Test", schema);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addResponseToComponents", () => {
    it("应该添加响应对象的全局响应", () => {
      const builder = new OpenAPIBuilder();
      const response: ResponseObject = {
        description: "成功响应",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      };
      const result = builder.addResponseToComponents("Success", response).build();

      expect(result.components?.responses?.Success).toStrictEqual(response);
    });

    it("应该添加引用对象的全局响应", () => {
      const builder = new OpenAPIBuilder();
      const responseRef: ReferenceObject = {
        $ref: "#/components/responses/CommonError",
      };
      const result = builder.addResponseToComponents("Error", responseRef).build();

      expect(result.components?.responses?.Error).toStrictEqual(responseRef);
    });

    it("不应该重复添加相同名称的全局响应", () => {
      const builder = new OpenAPIBuilder();
      const firstResponse: ResponseObject = { description: "第一个" };
      const secondResponse: ResponseObject = { description: "第二个" };
      const result = builder
        .addResponseToComponents("Test", firstResponse)
        .addResponseToComponents("Test", secondResponse)
        .build();

      expect(result.components?.responses?.Test).toStrictEqual(firstResponse);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const response: ResponseObject = { description: "测试" };
      const returnValue = builder.addResponseToComponents("Test", response);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addParameterToComponents", () => {
    it("应该添加参数对象的全局参数", () => {
      const builder = new OpenAPIBuilder();
      const parameter: ParameterObject = {
        name: "api-version",
        in: "header",
        required: true,
        schema: { type: "string" },
      };
      const result = builder.addParameterToComponents("ApiVersion", parameter).build();

      expect(result.components?.parameters?.ApiVersion).toStrictEqual(parameter);
    });

    it("应该添加引用对象的全局参数", () => {
      const builder = new OpenAPIBuilder();
      const parameterRef: ReferenceObject = {
        $ref: "#/components/parameters/CommonParam",
      };
      const result = builder.addParameterToComponents("Common", parameterRef).build();

      expect(result.components?.parameters?.Common).toStrictEqual(parameterRef);
    });

    it("不应该重复添加相同名称的全局参数", () => {
      const builder = new OpenAPIBuilder();
      const firstParam: ParameterObject = {
        name: "first",
        in: "query",
        schema: { type: "string" },
      };
      const secondParam: ParameterObject = {
        name: "second",
        in: "query",
        schema: { type: "string" },
      };
      const result = builder
        .addParameterToComponents("Test", firstParam)
        .addParameterToComponents("Test", secondParam)
        .build();

      expect(result.components?.parameters?.Test).toStrictEqual(firstParam);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const parameter: ParameterObject = {
        name: "test",
        in: "query",
        schema: { type: "string" },
      };
      const returnValue = builder.addParameterToComponents("Test", parameter);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addExampleToComponents", () => {
    it("应该添加示例对象的全局示例", () => {
      const builder = new OpenAPIBuilder();
      const example: ExampleObject = {
        summary: "用户示例",
        value: { id: "123", name: "张三" },
      };
      const result = builder.addExampleToComponents("UserExample", example).build();

      expect(result.components?.examples?.UserExample).toStrictEqual(example);
    });

    it("应该添加引用对象的全局示例", () => {
      const builder = new OpenAPIBuilder();
      const exampleRef: ReferenceObject = {
        $ref: "#/components/examples/CommonExample",
      };
      const result = builder.addExampleToComponents("Common", exampleRef).build();

      expect(result.components?.examples?.Common).toStrictEqual(exampleRef);
    });

    it("不应该重复添加相同名称的全局示例", () => {
      const builder = new OpenAPIBuilder();
      const firstExample: ExampleObject = { value: "first" };
      const secondExample: ExampleObject = { value: "second" };
      const result = builder
        .addExampleToComponents("Test", firstExample)
        .addExampleToComponents("Test", secondExample)
        .build();

      expect(result.components?.examples?.Test).toStrictEqual(firstExample);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const example: ExampleObject = { value: "test" };
      const returnValue = builder.addExampleToComponents("Test", example);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addRequestBodyToComponents", () => {
    it("应该添加请求体对象的全局请求体", () => {
      const builder = new OpenAPIBuilder();
      const requestBody: RequestBodyObject = {
        description: "用户创建请求体",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      };
      const result = builder.addRequestBodyToComponents("CreateUser", requestBody).build();

      expect(result.components?.requestBodies?.CreateUser).toStrictEqual(requestBody);
    });

    it("应该添加引用对象的全局请求体", () => {
      const builder = new OpenAPIBuilder();
      const requestBodyRef: ReferenceObject = {
        $ref: "#/components/requestBodies/CommonBody",
      };
      const result = builder.addRequestBodyToComponents("Common", requestBodyRef).build();

      expect(result.components?.requestBodies?.Common).toStrictEqual(requestBodyRef);
    });

    it("不应该重复添加相同名称的全局请求体", () => {
      const builder = new OpenAPIBuilder();
      const firstBody: RequestBodyObject = {
        description: "第一个",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      };
      const secondBody: RequestBodyObject = {
        description: "第二个",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      };
      const result = builder
        .addRequestBodyToComponents("Test", firstBody)
        .addRequestBodyToComponents("Test", secondBody)
        .build();

      expect(result.components?.requestBodies?.Test).toStrictEqual(firstBody);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const requestBody: RequestBodyObject = {
        description: "测试",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      };
      const returnValue = builder.addRequestBodyToComponents("Test", requestBody);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addHeaderToComponents", () => {
    it("应该添加头部对象的全局头部", () => {
      const builder = new OpenAPIBuilder();
      const header: HeaderObject = {
        description: "API 版本头部",
        schema: { type: "string" },
      };
      const result = builder.addHeaderToComponents("ApiVersion", header).build();

      expect(result.components?.headers?.ApiVersion).toStrictEqual(header);
    });

    it("应该添加引用对象的全局头部", () => {
      const builder = new OpenAPIBuilder();
      const headerRef: ReferenceObject = {
        $ref: "#/components/headers/CommonHeader",
      };
      const result = builder.addHeaderToComponents("Common", headerRef).build();

      expect(result.components?.headers?.Common).toStrictEqual(headerRef);
    });

    it("不应该重复添加相同名称的全局头部", () => {
      const builder = new OpenAPIBuilder();
      const firstHeader: HeaderObject = { description: "第一个" };
      const secondHeader: HeaderObject = { description: "第二个" };
      const result = builder
        .addHeaderToComponents("Test", firstHeader)
        .addHeaderToComponents("Test", secondHeader)
        .build();

      expect(result.components?.headers?.Test).toStrictEqual(firstHeader);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const header: HeaderObject = { description: "测试" };
      const returnValue = builder.addHeaderToComponents("Test", header);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addSecuritySchemeToComponents", () => {
    it("应该添加安全方案对象的全局安全方案", () => {
      const builder = new OpenAPIBuilder();
      const securityScheme: SecuritySchemeObject = {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      };
      const result = builder.addSecuritySchemeToComponents("BearerAuth", securityScheme).build();

      expect(result.components?.securitySchemes?.BearerAuth).toStrictEqual(securityScheme);
    });

    it("应该添加引用对象的全局安全方案", () => {
      const builder = new OpenAPIBuilder();
      const securitySchemeRef: ReferenceObject = {
        $ref: "#/components/securitySchemes/CommonAuth",
      };
      const result = builder.addSecuritySchemeToComponents("Common", securitySchemeRef).build();

      expect(result.components?.securitySchemes?.Common).toStrictEqual(securitySchemeRef);
    });

    it("不应该重复添加相同名称的全局安全方案", () => {
      const builder = new OpenAPIBuilder();
      const firstScheme: SecuritySchemeObject = { type: "apiKey" };
      const secondScheme: SecuritySchemeObject = { type: "http" };
      const result = builder
        .addSecuritySchemeToComponents("Test", firstScheme)
        .addSecuritySchemeToComponents("Test", secondScheme)
        .build();

      expect(result.components?.securitySchemes?.Test).toStrictEqual(firstScheme);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const securityScheme: SecuritySchemeObject = { type: "http" };
      const returnValue = builder.addSecuritySchemeToComponents("Test", securityScheme);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addLinkToComponents", () => {
    it("应该添加链接对象的全局链接", () => {
      const builder = new OpenAPIBuilder();
      const link: LinkObject = {
        operationRef: "#/paths/~1users~1{id}/get",
        description: "获取用户详情的链接",
      };
      const result = builder.addLinkToComponents("GetUser", link).build();

      expect(result.components?.links?.GetUser).toStrictEqual(link);
    });

    it("应该添加引用对象的全局链接", () => {
      const builder = new OpenAPIBuilder();
      const linkRef: ReferenceObject = {
        $ref: "#/components/links/CommonLink",
      };
      const result = builder.addLinkToComponents("Common", linkRef).build();

      expect(result.components?.links?.Common).toStrictEqual(linkRef);
    });

    it("不应该重复添加相同名称的全局链接", () => {
      const builder = new OpenAPIBuilder();
      const firstLink: LinkObject = { description: "第一个" };
      const secondLink: LinkObject = { description: "第二个" };
      const result = builder
        .addLinkToComponents("Test", firstLink)
        .addLinkToComponents("Test", secondLink)
        .build();

      expect(result.components?.links?.Test).toStrictEqual(firstLink);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const link: LinkObject = { description: "测试" };
      const returnValue = builder.addLinkToComponents("Test", link);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addCallbackToComponents", () => {
    it("应该添加回调对象的全局回调", () => {
      const builder = new OpenAPIBuilder();
      const callback: CallbackObject = {
        "{$request.body#/webhookUrl}": {
          post: {
            responses: { "200": { description: "回调成功" } },
          },
        },
      };
      const result = builder.addCallbackToComponents("WebhookCallback", callback).build();

      expect(result.components?.callbacks?.WebhookCallback).toStrictEqual(callback);
    });

    it("应该添加引用对象的全局回调", () => {
      const builder = new OpenAPIBuilder();
      const callbackRef: ReferenceObject = {
        $ref: "#/components/callbacks/CommonCallback",
      };
      const result = builder.addCallbackToComponents("Common", callbackRef).build();

      expect(result.components?.callbacks?.Common).toStrictEqual(callbackRef);
    });

    it("不应该重复添加相同名称的全局回调", () => {
      const builder = new OpenAPIBuilder();
      const firstCallback: CallbackObject = {};
      const secondCallback: CallbackObject = {};
      const result = builder
        .addCallbackToComponents("Test", firstCallback)
        .addCallbackToComponents("Test", secondCallback)
        .build();

      expect(result.components?.callbacks?.Test).toStrictEqual(firstCallback);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const callback: CallbackObject = {};
      const returnValue = builder.addCallbackToComponents("Test", callback);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addPathItemToComponents", () => {
    it("应该添加全局路径项", () => {
      const builder = new OpenAPIBuilder();
      const pathItem: PathItemObject = {
        summary: "通用路径项",
        get: {
          responses: { "200": { description: "成功" } },
        },
      };
      const result = builder.addPathItemToComponents("CommonPath", pathItem).build();

      expect(result.components?.pathItems?.CommonPath).toStrictEqual(pathItem);
    });

    it("应该添加多个不同的全局路径项", () => {
      const builder = new OpenAPIBuilder();
      const pathItem1: PathItemObject = { summary: "第一个" };
      const pathItem2: PathItemObject = { summary: "第二个" };
      const result = builder
        .addPathItemToComponents("Path1", pathItem1)
        .addPathItemToComponents("Path2", pathItem2)
        .build();

      expect(result.components?.pathItems?.Path1).toStrictEqual(pathItem1);
      expect(result.components?.pathItems?.Path2).toStrictEqual(pathItem2);
    });

    it("不应该重复添加相同名称的全局路径项", () => {
      const builder = new OpenAPIBuilder();
      const firstPathItem: PathItemObject = { summary: "第一个" };
      const secondPathItem: PathItemObject = { summary: "第二个" };
      const result = builder
        .addPathItemToComponents("Test", firstPathItem)
        .addPathItemToComponents("Test", secondPathItem)
        .build();

      expect(result.components?.pathItems?.Test).toStrictEqual(firstPathItem);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const pathItem: PathItemObject = {};
      const returnValue = builder.addPathItemToComponents("Test", pathItem);

      expect(returnValue).toStrictEqual(builder);
    });
  });

  describe("addComponentsExtension", () => {
    it("应该添加有效的组件扩展字段", () => {
      const builder = new OpenAPIBuilder();
      const extensionValue = { componentData: "test" };
      const result = builder
        .addComponentsExtension("x-components-extension", extensionValue)
        .build();

      expect(result.components?.["x-components-extension"]).toStrictEqual(extensionValue);
    });

    it("应该支持添加多个组件扩展字段", () => {
      const builder = new OpenAPIBuilder();
      const extension1 = "value1";
      const extension2 = { data: "value2" };
      const result = builder
        .addComponentsExtension("x-comp-1", extension1)
        .addComponentsExtension("x-comp-2", extension2)
        .build();

      expect(result.components?.["x-comp-1"]).toStrictEqual(extension1);
      expect(result.components?.["x-comp-2"]).toStrictEqual(extension2);
    });

    it("不应该重复添加相同的组件扩展字段", () => {
      const builder = new OpenAPIBuilder();
      const firstValue = "first";
      const secondValue = "second";
      const result = builder
        .addComponentsExtension("x-duplicate", firstValue)
        .addComponentsExtension("x-duplicate", secondValue)
        .build();

      expect(result.components?.["x-duplicate"]).toStrictEqual(firstValue);
    });

    it("应该支持链式调用", () => {
      const builder = new OpenAPIBuilder();
      const returnValue = builder.addComponentsExtension("x-test", "value");

      expect(returnValue).toStrictEqual(builder);
    });
  });
});
