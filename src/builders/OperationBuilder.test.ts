import { describe, expect, it } from "vitest";
import type {
  CallbackObject,
  ExternalDocumentationObject,
  ParameterObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  SecurityRequirementObject,
  ServerObject,
} from "@/types";
import { OperationBuilder } from "./OperationBuilder";
import { ParameterBuilder } from "./ParameterBuilder";
import { RequestBodyBuilder } from "./RequestBodyBuilder";
import { ResponseBuilder } from "./ResponseBuilder";

describe("OperationBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建带有空响应对象的默认操作对象", () => {
      const builder = new OperationBuilder();
      const result = builder.build();

      expect(result).toEqual({
        responses: {},
      });
    });

    it("应该在多次调用 build 方法时返回不同的对象引用", () => {
      const builder = new OperationBuilder();
      builder.setSummary("测试摘要");

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe("addTag", () => {
    it("应该添加单个标签", () => {
      const builder = new OperationBuilder();
      const result = builder.addTag("users").build();

      expect(result.tags).toEqual(["users"]);
    });

    it("应该添加多个不同的标签", () => {
      const builder = new OperationBuilder();
      const result = builder.addTag("users").addTag("authentication").build();

      expect(result.tags).toEqual(["users", "authentication"]);
    });

    it("不应该重复添加相同的标签", () => {
      const builder = new OperationBuilder();
      const result = builder.addTag("users").addTag("users").addTag("authentication").build();

      expect(result.tags).toEqual(["users", "authentication"]);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const returnValue = builder.addTag("test");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setSummary", () => {
    it("应该正确设置操作摘要", () => {
      const builder = new OperationBuilder();
      const summary = "获取用户列表";
      const result = builder.setSummary(summary).build();

      expect(result.summary).toBe(summary);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const returnValue = builder.setSummary("测试摘要");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setDescription", () => {
    it("应该正确设置操作描述", () => {
      const builder = new OperationBuilder();
      const description = "此接口用于获取系统中所有用户的列表信息";
      const result = builder.setDescription(description).build();

      expect(result.description).toBe(description);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const returnValue = builder.setDescription("测试描述");

      expect(returnValue).toBe(builder);
    });
  });

  describe("setExternalDocs", () => {
    it("应该正确设置外部文档", () => {
      const builder = new OperationBuilder();
      const externalDocs: ExternalDocumentationObject = {
        description: "更多信息请参考外部文档",
        url: "https://example.com/docs",
      };
      const result = builder.setExternalDocs(externalDocs).build();

      expect(result.externalDocs).toStrictEqual(externalDocs);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const externalDocs: ExternalDocumentationObject = {
        url: "https://example.com",
      };
      const returnValue = builder.setExternalDocs(externalDocs);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setOperationId", () => {
    it("应该正确设置操作 ID", () => {
      const builder = new OperationBuilder();
      const operationId = "getUserList";
      const result = builder.setOperationId(operationId).build();

      expect(result.operationId).toBe(operationId);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const returnValue = builder.setOperationId("testOperation");

      expect(returnValue).toBe(builder);
    });
  });

  describe("addParameterFromObject", () => {
    it("应该添加单个参数对象", () => {
      const builder = new OperationBuilder();
      const parameter: ParameterObject = {
        name: "userId",
        in: "query",
        required: true,
        schema: { type: "string" },
      };
      const result = builder.addParameterFromObject(parameter).build();

      expect(result.parameters).toEqual([parameter]);
    });

    it("应该添加多个不同的参数对象", () => {
      const builder = new OperationBuilder();
      const param1: ParameterObject = {
        name: "userId",
        in: "query",
        schema: { type: "string" },
      };
      const param2: ParameterObject = {
        name: "limit",
        in: "query",
        schema: { type: "integer" },
      };
      const result = builder.addParameterFromObject(param1).addParameterFromObject(param2).build();

      expect(result.parameters).toEqual([param1, param2]);
    });

    it("不应该重复添加相同名称和位置的参数", () => {
      const builder = new OperationBuilder();
      const param1: ParameterObject = {
        name: "userId",
        in: "query",
        schema: { type: "string" },
      };
      const param2: ParameterObject = {
        name: "userId",
        in: "query",
        schema: { type: "integer" },
      };
      const result = builder.addParameterFromObject(param1).addParameterFromObject(param2).build();

      expect(result.parameters).toEqual([param1]);
    });

    it("应该允许添加同名但不同位置的参数", () => {
      const builder = new OperationBuilder();
      const queryParam: ParameterObject = {
        name: "id",
        in: "query",
        schema: { type: "string" },
      };
      const pathParam: ParameterObject = {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string" },
      };
      const result = builder
        .addParameterFromObject(queryParam)
        .addParameterFromObject(pathParam)
        .build();

      expect(result.parameters).toEqual([queryParam, pathParam]);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const parameter: ParameterObject = {
        name: "test",
        in: "query",
        schema: { type: "string" },
      };
      const returnValue = builder.addParameterFromObject(parameter);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addParameterFromReference", () => {
    it("应该添加单个参数引用", () => {
      const builder = new OperationBuilder();
      const parameterRef: ReferenceObject = {
        $ref: "#/components/parameters/UserIdParam",
      };
      const result = builder.addParameterFromReference(parameterRef).build();

      expect(result.parameters).toEqual([parameterRef]);
    });

    it("应该添加多个不同的参数引用", () => {
      const builder = new OperationBuilder();
      const ref1: ReferenceObject = {
        $ref: "#/components/parameters/UserIdParam",
      };
      const ref2: ReferenceObject = {
        $ref: "#/components/parameters/LimitParam",
      };
      const result = builder
        .addParameterFromReference(ref1)
        .addParameterFromReference(ref2)
        .build();

      expect(result.parameters).toEqual([ref1, ref2]);
    });

    it("不应该重复添加相同的参数引用", () => {
      const builder = new OperationBuilder();
      const parameterRef: ReferenceObject = {
        $ref: "#/components/parameters/UserIdParam",
      };
      const result = builder
        .addParameterFromReference(parameterRef)
        .addParameterFromReference(parameterRef)
        .build();

      expect(result.parameters).toEqual([parameterRef]);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const parameterRef: ReferenceObject = {
        $ref: "#/components/parameters/TestParam",
      };
      const returnValue = builder.addParameterFromReference(parameterRef);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addParameterFromBuilder", () => {
    it("应该使用 ParameterBuilder 添加参数", () => {
      const builder = new OperationBuilder();
      const paramBuilder = new ParameterBuilder("userId", "query")
        .setRequired(true)
        .setDescription("用户ID");
      const result = builder.addParameterFromBuilder(paramBuilder).build();

      expect(result.parameters).toEqual([paramBuilder.build()]);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const paramBuilder = new ParameterBuilder("test", "query");
      const returnValue = builder.addParameterFromBuilder(paramBuilder);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setRequestBody", () => {
    it("应该设置请求体对象", () => {
      const builder = new OperationBuilder();
      const requestBody: RequestBodyObject = {
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
        required: true,
      };
      const result = builder.setRequestBody(requestBody).build();

      expect(result.requestBody).toStrictEqual(requestBody);
    });

    it("应该设置请求体引用", () => {
      const builder = new OperationBuilder();
      const requestBodyRef: ReferenceObject = {
        $ref: "#/components/requestBodies/UserRequestBody",
      };
      const result = builder.setRequestBody(requestBodyRef).build();

      expect(result.requestBody).toStrictEqual(requestBodyRef);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const requestBody: RequestBodyObject = {
        content: {},
      };
      const returnValue = builder.setRequestBody(requestBody);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setRequestBodyFromBuilder", () => {
    it("应该使用 RequestBodyBuilder 设置请求体", () => {
      const builder = new OperationBuilder();
      const requestBodyBuilder = new RequestBodyBuilder()
        .setDescription("用户创建请求体")
        .setRequired(true);
      const result = builder.setRequestBodyFromBuilder(requestBodyBuilder).build();

      expect(result.requestBody).toEqual(requestBodyBuilder.build());
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const requestBodyBuilder = new RequestBodyBuilder();
      const returnValue = builder.setRequestBodyFromBuilder(requestBodyBuilder);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addResponse", () => {
    it("应该添加响应对象", () => {
      const builder = new OperationBuilder();
      const response: ResponseObject = {
        description: "成功响应",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      };
      const result = builder.addResponse("200", response).build();

      expect(result.responses["200"]).toStrictEqual(response);
    });

    it("应该添加默认响应", () => {
      const builder = new OperationBuilder();
      const response: ResponseObject = {
        description: "默认响应",
      };
      const result = builder.addResponse("default", response).build();

      expect(result.responses.default).toStrictEqual(response);
    });

    it("应该添加响应引用", () => {
      const builder = new OperationBuilder();
      const responseRef: ReferenceObject = {
        $ref: "#/components/responses/ErrorResponse",
      };
      const result = builder.addResponse("400", responseRef).build();

      expect(result.responses["400"]).toStrictEqual(responseRef);
    });

    it("应该添加多个不同状态码的响应", () => {
      const builder = new OperationBuilder();
      const successResponse: ResponseObject = {
        description: "成功",
      };
      const errorResponse: ResponseObject = {
        description: "错误",
      };
      const result = builder
        .addResponse("200", successResponse)
        .addResponse("400", errorResponse)
        .build();

      expect(result.responses["200"]).toStrictEqual(successResponse);
      expect(result.responses["400"]).toStrictEqual(errorResponse);
    });

    it("不应该重复添加相同状态码的响应", () => {
      const builder = new OperationBuilder();
      const firstResponse: ResponseObject = {
        description: "第一个响应",
      };
      const secondResponse: ResponseObject = {
        description: "第二个响应",
      };
      const result = builder
        .addResponse("200", firstResponse)
        .addResponse("200", secondResponse)
        .build();

      expect(result.responses["200"]).toStrictEqual(firstResponse);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const response: ResponseObject = {
        description: "测试响应",
      };
      const returnValue = builder.addResponse("200", response);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addResponseFromBuilder", () => {
    it("应该使用 ResponseBuilder 添加响应", () => {
      const builder = new OperationBuilder();
      const responseBuilder = new ResponseBuilder().setDescription("成功响应");
      const result = builder.addResponseFromBuilder("200", responseBuilder).build();

      expect(result.responses["200"]).toEqual(responseBuilder.build());
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const responseBuilder = new ResponseBuilder();
      const returnValue = builder.addResponseFromBuilder("200", responseBuilder);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addCallback", () => {
    it("应该添加回调对象", () => {
      const builder = new OperationBuilder();
      const callback: CallbackObject = {
        "http://notificationUrl": {
          post: {
            responses: {
              "200": {
                description: "回调成功",
              },
            },
          },
        },
      };
      const result = builder.addCallback("userCreated", callback).build();

      expect(result.callbacks?.userCreated).toStrictEqual(callback);
    });

    it("应该添加回调引用", () => {
      const builder = new OperationBuilder();
      const callbackRef: ReferenceObject = {
        $ref: "#/components/callbacks/UserCallback",
      };
      const result = builder.addCallback("userUpdated", callbackRef).build();

      expect(result.callbacks?.userUpdated).toStrictEqual(callbackRef);
    });

    it("应该添加多个不同名称的回调", () => {
      const builder = new OperationBuilder();
      const callback1: CallbackObject = {};
      const callback2: CallbackObject = {};
      const result = builder
        .addCallback("event1", callback1)
        .addCallback("event2", callback2)
        .build();

      expect(result.callbacks?.event1).toStrictEqual(callback1);
      expect(result.callbacks?.event2).toStrictEqual(callback2);
    });

    it("不应该重复添加相同名称的回调", () => {
      const builder = new OperationBuilder();
      const firstCallback: CallbackObject = {};
      const secondCallback: CallbackObject = {};
      const result = builder
        .addCallback("duplicate", firstCallback)
        .addCallback("duplicate", secondCallback)
        .build();

      expect(result.callbacks?.duplicate).toStrictEqual(firstCallback);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const callback: CallbackObject = {};
      const returnValue = builder.addCallback("test", callback);

      expect(returnValue).toBe(builder);
    });
  });

  describe("setDeprecated", () => {
    it("应该正确设置已废弃为 true", () => {
      const builder = new OperationBuilder();
      const result = builder.setDeprecated(true).build();

      expect(result.deprecated).toBe(true);
    });

    it("应该正确设置已废弃为 false", () => {
      const builder = new OperationBuilder();
      const result = builder.setDeprecated(false).build();

      expect(result.deprecated).toBe(false);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const returnValue = builder.setDeprecated(true);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addSecurity", () => {
    it("应该添加单个安全要求", () => {
      const builder = new OperationBuilder();
      const securityRequirement: SecurityRequirementObject = {
        bearerAuth: [],
      };
      const result = builder.addSecurity(securityRequirement).build();

      expect(result.security).toEqual([securityRequirement]);
    });

    it("应该添加多个安全要求", () => {
      const builder = new OperationBuilder();
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
      const builder = new OperationBuilder();
      const securityRequirement: SecurityRequirementObject = {
        bearerAuth: [],
      };
      const returnValue = builder.addSecurity(securityRequirement);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addServer", () => {
    it("应该添加单个服务器", () => {
      const builder = new OperationBuilder();
      const server: ServerObject = {
        url: "https://api.example.com",
        description: "生产环境服务器",
      };
      const result = builder.addServer(server).build();

      expect(result.servers).toEqual([server]);
    });

    it("应该添加多个服务器", () => {
      const builder = new OperationBuilder();
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
      const builder = new OperationBuilder();
      const server: ServerObject = {
        url: "https://test.example.com",
      };
      const returnValue = builder.addServer(server);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addExtension", () => {
    it("应该添加有效的扩展字段", () => {
      const builder = new OperationBuilder();
      const extensionValue = { customData: "test" };
      const result = builder.addExtension("x-custom-extension", extensionValue).build();

      expect(result["x-custom-extension"]).toStrictEqual(extensionValue);
    });

    it("应该支持添加多个扩展字段", () => {
      const builder = new OperationBuilder();
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
      const builder = new OperationBuilder();
      const firstValue = "first";
      const secondValue = "second";
      const result = builder
        .addExtension("x-duplicate", firstValue)
        .addExtension("x-duplicate", secondValue)
        .build();

      expect(result["x-duplicate"]).toStrictEqual(firstValue);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const returnValue = builder.addExtension("x-test", "value");

      expect(returnValue).toBe(builder);
    });
  });

  describe("addResponsesExtension", () => {
    it("应该添加有效的响应扩展字段", () => {
      const builder = new OperationBuilder();
      const extensionValue = { responseData: "test" };
      const result = builder.addResponsesExtension("x-response-extension", extensionValue).build();

      expect(result.responses["x-response-extension"]).toStrictEqual(extensionValue);
    });

    it("应该支持添加多个响应扩展字段", () => {
      const builder = new OperationBuilder();
      const extension1 = "value1";
      const extension2 = { data: "value2" };
      const result = builder
        .addResponsesExtension("x-response-1", extension1)
        .addResponsesExtension("x-response-2", extension2)
        .build();

      expect(result.responses["x-response-1"]).toStrictEqual(extension1);
      expect(result.responses["x-response-2"]).toStrictEqual(extension2);
    });

    it("不应该重复添加相同的响应扩展字段", () => {
      const builder = new OperationBuilder();
      const firstValue = "first";
      const secondValue = "second";
      const result = builder
        .addResponsesExtension("x-duplicate", firstValue)
        .addResponsesExtension("x-duplicate", secondValue)
        .build();

      expect(result.responses["x-duplicate"]).toStrictEqual(firstValue);
    });

    it("应该支持链式调用", () => {
      const builder = new OperationBuilder();
      const returnValue = builder.addResponsesExtension("x-test", "value");

      expect(returnValue).toBe(builder);
    });
  });
});
