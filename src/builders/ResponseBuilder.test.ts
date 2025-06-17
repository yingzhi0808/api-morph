import { describe, expect, it } from "vitest";
import type { HeaderObject, LinkObject, MediaTypeObject, ReferenceObject } from "@/types";
import { ResponseBuilder } from "./ResponseBuilder";

describe("ResponseBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建带有空描述的默认响应对象", () => {
      const builder = new ResponseBuilder();
      const result = builder.build();

      expect(result).toEqual({
        description: "",
      });
    });

    it("应该在多次调用 build 方法时返回不同的对象引用", () => {
      const builder = new ResponseBuilder();
      builder.setDescription("测试描述");

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe("setDescription", () => {
    it("应该正确设置响应描述", () => {
      const builder = new ResponseBuilder();
      const description = "成功响应";
      const result = builder.setDescription(description).build();

      expect(result.description).toBe(description);
    });

    it("应该支持链式调用", () => {
      const builder = new ResponseBuilder();
      const returnValue = builder.setDescription("测试描述");

      expect(returnValue).toBe(builder);
    });
  });

  describe("addHeader", () => {
    it("应该添加单个头信息", () => {
      const builder = new ResponseBuilder();
      const headerObject: HeaderObject = {
        description: "自定义头信息",
        schema: { type: "string" },
      };
      const result = builder.addHeader("x-custom-header", headerObject).build();

      expect(result.headers).toEqual({
        "x-custom-header": headerObject,
      });
    });

    it("应该添加引用对象头信息", () => {
      const builder = new ResponseBuilder();
      const referenceObject: ReferenceObject = {
        $ref: "#/components/headers/CustomHeader",
      };
      const result = builder.addHeader("x-ref-header", referenceObject).build();

      expect(result.headers).toEqual({
        "x-ref-header": referenceObject,
      });
    });

    it("应该将头信息名称转换为小写", () => {
      const builder = new ResponseBuilder();
      const headerObject: HeaderObject = {
        description: "大写头信息",
      };
      const result = builder.addHeader("X-UPPERCASE-HEADER", headerObject).build();

      expect(result.headers).toEqual({
        "x-uppercase-header": headerObject,
      });
    });

    it("应该过滤掉 content-type 头（小写）", () => {
      const builder = new ResponseBuilder();
      const headerObject: HeaderObject = {
        description: "内容类型头",
      };
      const result = builder.addHeader("content-type", headerObject).build();

      expect(result.headers).toEqual({});
    });

    it("应该过滤掉 Content-Type 头（大小写混合）", () => {
      const builder = new ResponseBuilder();
      const headerObject: HeaderObject = {
        description: "内容类型头",
      };
      const result = builder.addHeader("Content-Type", headerObject).build();

      expect(result.headers).toEqual({});
    });

    it("应该过滤掉 CONTENT-TYPE 头（大写）", () => {
      const builder = new ResponseBuilder();
      const headerObject: HeaderObject = {
        description: "内容类型头",
      };
      const result = builder.addHeader("CONTENT-TYPE", headerObject).build();

      expect(result.headers).toEqual({});
    });

    it("不应该重复添加相同名称的头信息", () => {
      const builder = new ResponseBuilder();
      const firstHeader: HeaderObject = {
        description: "第一个头信息",
      };
      const secondHeader: HeaderObject = {
        description: "第二个头信息",
      };
      const result = builder
        .addHeader("x-duplicate", firstHeader)
        .addHeader("x-duplicate", secondHeader)
        .build();

      expect(result.headers).toEqual({
        "x-duplicate": firstHeader,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ResponseBuilder();
      const headerObject: HeaderObject = {
        description: "测试头信息",
      };
      const returnValue = builder.addHeader("x-test", headerObject);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addContent", () => {
    it("应该添加单个内容类型", () => {
      const builder = new ResponseBuilder();
      const mediaTypeObject: MediaTypeObject = {
        schema: { type: "object" },
        example: { message: "success" },
      };
      const result = builder.addContent("application/json", mediaTypeObject).build();

      expect(result.content).toEqual({
        "application/json": mediaTypeObject,
      });
    });

    it("不应该重复添加相同的媒体类型", () => {
      const builder = new ResponseBuilder();
      const firstMediaType: MediaTypeObject = {
        schema: { type: "object" },
        example: { message: "first" },
      };
      const secondMediaType: MediaTypeObject = {
        schema: { type: "object" },
        example: { message: "second" },
      };
      const result = builder
        .addContent("application/json", firstMediaType)
        .addContent("application/json", secondMediaType)
        .build();

      expect(result.content).toEqual({
        "application/json": firstMediaType,
      });
    });

    it("应该支持添加多种不同的媒体类型", () => {
      const builder = new ResponseBuilder();
      const jsonMediaType: MediaTypeObject = {
        schema: { type: "object" },
      };
      const xmlMediaType: MediaTypeObject = {
        schema: { type: "string" },
      };
      const result = builder
        .addContent("application/json", jsonMediaType)
        .addContent("application/xml", xmlMediaType)
        .build();

      expect(result.content).toEqual({
        "application/json": jsonMediaType,
        "application/xml": xmlMediaType,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ResponseBuilder();
      const mediaTypeObject: MediaTypeObject = {
        schema: { type: "object" },
      };
      const returnValue = builder.addContent("application/json", mediaTypeObject);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addLink", () => {
    it("应该添加单个链接对象", () => {
      const builder = new ResponseBuilder();
      const linkObject: LinkObject = {
        operationId: "getUserById",
        parameters: { id: "$response.body#/id" },
        description: "获取用户详情的链接",
      };
      const result = builder.addLink("userDetails", linkObject).build();

      expect(result.links).toEqual({
        userDetails: linkObject,
      });
    });

    it("应该添加引用对象链接", () => {
      const builder = new ResponseBuilder();
      const referenceObject: ReferenceObject = {
        $ref: "#/components/links/UserDetailsLink",
      };
      const result = builder.addLink("userRef", referenceObject).build();

      expect(result.links).toEqual({
        userRef: referenceObject,
      });
    });

    it("不应该重复添加相同名称的链接", () => {
      const builder = new ResponseBuilder();
      const firstLink: LinkObject = {
        operationId: "firstOperation",
        description: "第一个链接",
      };
      const secondLink: LinkObject = {
        operationId: "secondOperation",
        description: "第二个链接",
      };
      const result = builder
        .addLink("duplicate", firstLink)
        .addLink("duplicate", secondLink)
        .build();

      expect(result.links).toEqual({
        duplicate: firstLink,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new ResponseBuilder();
      const linkObject: LinkObject = {
        operationId: "testOperation",
      };
      const returnValue = builder.addLink("test", linkObject);

      expect(returnValue).toBe(builder);
    });
  });

  describe("addExtension", () => {
    it("应该添加有效的扩展字段", () => {
      const builder = new ResponseBuilder();
      const extensionValue = { customData: "test" };
      const result = builder.addExtension("x-custom-extension", extensionValue).build();

      expect(result["x-custom-extension"]).toStrictEqual(extensionValue);
    });

    it("应该支持添加多个扩展字段", () => {
      const builder = new ResponseBuilder();
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
      const builder = new ResponseBuilder();
      const firstValue = "first";
      const secondValue = "second";
      const result = builder
        .addExtension("x-duplicate", firstValue)
        .addExtension("x-duplicate", secondValue)
        .build();

      expect(result["x-duplicate"]).toStrictEqual(firstValue); // 应该保持第一个添加的值
    });

    it("应该支持链式调用", () => {
      const builder = new ResponseBuilder();
      const returnValue = builder.addExtension("x-test", "value");

      expect(returnValue).toBe(builder);
    });
  });
});
