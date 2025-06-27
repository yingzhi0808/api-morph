import { describe, expect, it } from "vitest";
import type { HttpMethod } from "@/types/common";
import type {
  OperationObject,
  ParameterObject,
  ReferenceObject,
  ServerObject,
} from "@/types/openapi";
import { OperationBuilder } from "./OperationBuilder";
import { ParameterBuilder } from "./ParameterBuilder";
import { PathItemBuilder } from "./PathItemBuilder";

describe("PathItemBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建空的默认路径项对象", () => {
      const builder = new PathItemBuilder();
      const result = builder.build();

      expect(result).toEqual({});
    });

    it("应该在多次调用 build 方法时返回不同的对象引用", () => {
      const builder = new PathItemBuilder();
      builder.setSummary("测试摘要");

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe("setRef", () => {
    it("应该正确设置引用路径", () => {
      const builder = new PathItemBuilder();
      const ref = "#/components/pathItems/UserPath";
      const result = builder.setRef(ref).build();

      expect(result.$ref).toBe(ref);
    });

    it("应该支持链式调用", () => {
      const builder = new PathItemBuilder();
      const returnValue = builder.setRef("#/components/pathItems/TestPath");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setSummary", () => {
    it("应该正确设置路径摘要", () => {
      const builder = new PathItemBuilder();
      const summary = "用户管理相关接口";
      const result = builder.setSummary(summary).build();

      expect(result.summary).toBe(summary);
    });

    it("应该支持链式调用", () => {
      const builder = new PathItemBuilder();
      const returnValue = builder.setSummary("测试摘要");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setDescription", () => {
    it("应该正确设置路径描述", () => {
      const builder = new PathItemBuilder();
      const description = "提供用户增删改查等基础功能的 API 接口";
      const result = builder.setDescription(description).build();

      expect(result.description).toBe(description);
    });

    it("应该支持链式调用", () => {
      const builder = new PathItemBuilder();
      const returnValue = builder.setDescription("测试描述");

      expect(returnValue).toBe(builder);
    });
  });

  describe("addOperation", () => {
    it("应该添加 GET 操作", () => {
      const builder = new PathItemBuilder();
      const operation: OperationObject = {
        responses: {
          "200": {
            description: "成功获取用户列表",
          },
        },
        summary: "获取用户列表",
      };
      const result = builder.addOperation("get", operation).build();

      expect(result.get).toStrictEqual(operation);
    });

    it("不应该重复添加相同 HTTP 方法的操作", () => {
      const builder = new PathItemBuilder();
      const firstOperation: OperationObject = {
        responses: { "200": { description: "第一个操作" } },
      };
      const secondOperation: OperationObject = {
        responses: { "200": { description: "第二个操作" } },
      };
      const result = builder
        .addOperation("get", firstOperation)
        .addOperation("get", secondOperation)
        .build();

      expect(result.get).toStrictEqual(firstOperation);
    });

    it("应该支持所有 HTTP 方法", () => {
      const builder = new PathItemBuilder();
      const operation: OperationObject = {
        responses: { "200": { description: "测试" } },
      };
      const httpMethods: HttpMethod[] = [
        "get",
        "put",
        "post",
        "delete",
        "options",
        "head",
        "patch",
        "trace",
      ];

      for (const method of httpMethods) {
        builder.addOperation(method, operation);
      }

      const result = builder.build();

      for (const method of httpMethods) {
        expect(result[method]).toStrictEqual(operation);
      }
    });

    it("应该支持链式调用", () => {
      const builder = new PathItemBuilder();
      const operation: OperationObject = {
        responses: { "200": { description: "测试" } },
      };
      const returnValue = builder.addOperation("get", operation);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addOperationFromBuilder", () => {
    it("应该使用 OperationBuilder 添加操作", () => {
      const builder = new PathItemBuilder();
      const operationBuilder = new OperationBuilder()
        .setSummary("获取用户信息")
        .setDescription("根据用户ID获取用户详细信息")
        .addResponse("200", { description: "成功" });
      const result = builder.addOperationFromBuilder("get", operationBuilder).build();

      expect(result.get).toEqual(operationBuilder.build());
    });

    it("应该支持添加多个不同方法的操作", () => {
      const builder = new PathItemBuilder();
      const getOperationBuilder = new OperationBuilder().setSummary("获取");
      const postOperationBuilder = new OperationBuilder().setSummary("创建");
      const result = builder
        .addOperationFromBuilder("get", getOperationBuilder)
        .addOperationFromBuilder("post", postOperationBuilder)
        .build();

      expect(result.get).toEqual(getOperationBuilder.build());
      expect(result.post).toEqual(postOperationBuilder.build());
    });

    it("应该支持链式调用", () => {
      const builder = new PathItemBuilder();
      const operationBuilder = new OperationBuilder();
      const returnValue = builder.addOperationFromBuilder("get", operationBuilder);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addServer", () => {
    it("应该添加单个服务器", () => {
      const builder = new PathItemBuilder();
      const server: ServerObject = {
        url: "https://api.example.com",
        description: "生产环境服务器",
      };
      const result = builder.addServer(server).build();

      expect(result.servers).toEqual([server]);
    });

    it("应该添加多个服务器", () => {
      const builder = new PathItemBuilder();
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
      const builder = new PathItemBuilder();
      const server: ServerObject = {
        url: "https://test.example.com",
      };
      const returnValue = builder.addServer(server);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addParameterFromObject", () => {
    it("应该添加单个参数对象", () => {
      const builder = new PathItemBuilder();
      const parameter: ParameterObject = {
        name: "version",
        in: "header",
        required: true,
        schema: { type: "string" },
      };
      const result = builder.addParameterFromObject(parameter).build();

      expect(result.parameters).toEqual([parameter]);
    });

    it("应该添加多个不同的参数对象", () => {
      const builder = new PathItemBuilder();
      const param1: ParameterObject = {
        name: "version",
        in: "header",
        schema: { type: "string" },
      };
      const param2: ParameterObject = {
        name: "lang",
        in: "header",
        schema: { type: "string" },
      };
      const result = builder.addParameterFromObject(param1).addParameterFromObject(param2).build();

      expect(result.parameters).toEqual([param1, param2]);
    });

    it("不应该重复添加相同名称和位置的参数", () => {
      const builder = new PathItemBuilder();
      const param1: ParameterObject = {
        name: "version",
        in: "header",
        schema: { type: "string" },
      };
      const param2: ParameterObject = {
        name: "version",
        in: "header",
        schema: { type: "integer" },
      };
      const result = builder.addParameterFromObject(param1).addParameterFromObject(param2).build();

      expect(result.parameters).toEqual([param1]);
    });

    it("应该允许添加同名但不同位置的参数", () => {
      const builder = new PathItemBuilder();
      const headerParam: ParameterObject = {
        name: "id",
        in: "header",
        schema: { type: "string" },
      };
      const queryParam: ParameterObject = {
        name: "id",
        in: "query",
        schema: { type: "string" },
      };
      const result = builder
        .addParameterFromObject(headerParam)
        .addParameterFromObject(queryParam)
        .build();

      expect(result.parameters).toEqual([headerParam, queryParam]);
    });

    it("应该支持链式调用", () => {
      const builder = new PathItemBuilder();
      const parameter: ParameterObject = {
        name: "test",
        in: "header",
        schema: { type: "string" },
      };
      const returnValue = builder.addParameterFromObject(parameter);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addParameterFromReference", () => {
    it("应该添加单个参数引用", () => {
      const builder = new PathItemBuilder();
      const parameterRef: ReferenceObject = {
        $ref: "#/components/parameters/VersionHeader",
      };
      const result = builder.addParameterFromReference(parameterRef).build();

      expect(result.parameters).toEqual([parameterRef]);
    });

    it("应该添加多个不同的参数引用", () => {
      const builder = new PathItemBuilder();
      const ref1: ReferenceObject = {
        $ref: "#/components/parameters/VersionHeader",
      };
      const ref2: ReferenceObject = {
        $ref: "#/components/parameters/LangHeader",
      };
      const result = builder
        .addParameterFromReference(ref1)
        .addParameterFromReference(ref2)
        .build();

      expect(result.parameters).toEqual([ref1, ref2]);
    });

    it("不应该重复添加相同的参数引用", () => {
      const builder = new PathItemBuilder();
      const parameterRef: ReferenceObject = {
        $ref: "#/components/parameters/VersionHeader",
      };
      const result = builder
        .addParameterFromReference(parameterRef)
        .addParameterFromReference(parameterRef)
        .build();

      expect(result.parameters).toEqual([parameterRef]);
    });

    it("应该支持链式调用", () => {
      const builder = new PathItemBuilder();
      const parameterRef: ReferenceObject = {
        $ref: "#/components/parameters/TestParam",
      };
      const returnValue = builder.addParameterFromReference(parameterRef);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addParameterFromBuilder", () => {
    it("应该使用 ParameterBuilder 添加参数", () => {
      const builder = new PathItemBuilder();
      const paramBuilder = new ParameterBuilder("api-version", "header")
        .setRequired(true)
        .setDescription("API 版本号");
      const result = builder.addParameterFromBuilder(paramBuilder).build();

      expect(result.parameters).toEqual([paramBuilder.build()]);
    });

    it("应该支持链式调用", () => {
      const builder = new PathItemBuilder();
      const paramBuilder = new ParameterBuilder("test", "header");
      const returnValue = builder.addParameterFromBuilder(paramBuilder);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addExtension", () => {
    it("应该添加有效的扩展字段", () => {
      const builder = new PathItemBuilder();
      const extensionValue = { pathData: "test" };
      const result = builder.addExtension("x-path-extension", extensionValue).build();

      expect(result["x-path-extension"]).toStrictEqual(extensionValue);
    });

    it("应该支持添加多个扩展字段", () => {
      const builder = new PathItemBuilder();
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
      const builder = new PathItemBuilder();
      const firstValue = "first";
      const secondValue = "second";
      const result = builder
        .addExtension("x-duplicate", firstValue)
        .addExtension("x-duplicate", secondValue)
        .build();

      expect(result["x-duplicate"]).toBe(firstValue);
    });

    it("应该支持链式调用", () => {
      const builder = new PathItemBuilder();
      const returnValue = builder.addExtension("x-test", "value");

      expect(returnValue).toBe(builder);
    });
  });
});
