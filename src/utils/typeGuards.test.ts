import { describe, expect, it } from "vitest";
import type { ParameterObject, ReferenceObject } from "@/types";
import { isExtensionKey, isParameterObject } from "@/utils";

describe("typeGuards", () => {
  describe("isParameterObject", () => {
    it("应该正确识别 ParameterObject", () => {
      const parameterObject: ParameterObject = {
        name: "userId",
        in: "path",
        required: true,
        schema: {
          type: "string",
        },
      };

      expect(isParameterObject(parameterObject)).toBe(true);
    });

    it("应该正确识别最小的 ParameterObject", () => {
      const minimalParameterObject: ParameterObject = {
        name: "query",
        in: "query",
      };

      expect(isParameterObject(minimalParameterObject)).toBe(true);
    });

    it("应该正确识别包含所有可选属性的 ParameterObject", () => {
      const fullParameterObject: ParameterObject = {
        name: "limit",
        in: "query",
        description: "限制返回结果数量",
        required: false,
        deprecated: false,
        allowEmptyValue: true,
        style: "form",
        explode: true,
        allowReserved: false,
        schema: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          default: 10,
        },
        example: 20,
        examples: {
          small: {
            value: 5,
            summary: "小数量",
          },
          large: {
            value: 50,
            summary: "大数量",
          },
        },
        content: {
          "application/json": {
            schema: {
              type: "integer",
            },
          },
        },
        "x-custom": "自定义扩展",
      };

      expect(isParameterObject(fullParameterObject)).toBe(true);
    });

    it("应该正确识别 ReferenceObject", () => {
      const referenceObject: ReferenceObject = {
        $ref: "#/components/parameters/UserId",
      };

      expect(isParameterObject(referenceObject)).toBe(false);
    });

    it("应该正确识别包含 summary 的 ReferenceObject", () => {
      const referenceObjectWithSummary: ReferenceObject = {
        $ref: "#/components/parameters/UserId",
        summary: "用户ID参数引用",
      };

      expect(isParameterObject(referenceObjectWithSummary)).toBe(false);
    });

    it("应该正确识别包含 description 的 ReferenceObject", () => {
      const referenceObjectWithDescription: ReferenceObject = {
        $ref: "#/components/parameters/UserId",
        description: "用户ID参数的详细描述",
      };

      expect(isParameterObject(referenceObjectWithDescription)).toBe(false);
    });
  });

  describe("isExtensionKey", () => {
    it("应该正确识别有效的扩展键", () => {
      expect(isExtensionKey("x-custom")).toBe(true);
      expect(isExtensionKey("x-vendor-extension")).toBe(true);
      expect(isExtensionKey("x-api-version")).toBe(true);
      expect(isExtensionKey("x-rate-limit")).toBe(true);
      expect(isExtensionKey("x-")).toBe(true);
    });

    it("应该正确识别包含特殊字符的有效扩展键", () => {
      expect(isExtensionKey("x-custom-field")).toBe(true);
      expect(isExtensionKey("x-vendor_extension")).toBe(true);
      expect(isExtensionKey("x-api.version")).toBe(true);
      expect(isExtensionKey("x-123")).toBe(true);
      expect(isExtensionKey("x-custom-field-with-many-dashes")).toBe(true);
    });

    it("应该正确识别大小写混合的有效扩展键", () => {
      expect(isExtensionKey("x-Custom")).toBe(true);
      expect(isExtensionKey("x-VENDOR")).toBe(true);
      expect(isExtensionKey("x-CamelCase")).toBe(true);
      expect(isExtensionKey("x-mixedCASE")).toBe(true);
    });

    it("应该正确拒绝无效的扩展键", () => {
      expect(isExtensionKey("custom")).toBe(false);
      expect(isExtensionKey("vendor-extension")).toBe(false);
      expect(isExtensionKey("api-version")).toBe(false);
      expect(isExtensionKey("")).toBe(false);
      expect(isExtensionKey("x")).toBe(false);
    });

    it("应该正确拒绝大写 X 开头的键", () => {
      expect(isExtensionKey("X-custom")).toBe(false);
      expect(isExtensionKey("X-vendor")).toBe(false);
      expect(isExtensionKey("X-")).toBe(false);
    });

    it("应该正确拒绝不以 x- 开头的键", () => {
      expect(isExtensionKey("y-custom")).toBe(false);
      expect(isExtensionKey("z-vendor")).toBe(false);
      expect(isExtensionKey("a-extension")).toBe(false);
      expect(isExtensionKey("xx-custom")).toBe(false);
    });

    // 注意：当前实现只检查是否以 "x-" 开头，不验证后续字符的有效性
    it("应该接受包含空格的扩展键（当前实现行为）", () => {
      expect(isExtensionKey("x- custom")).toBe(true);
      expect(isExtensionKey("x-custom ")).toBe(true);
      expect(isExtensionKey(" x-custom")).toBe(false); // 开头有空格，不以 "x-" 开头
      expect(isExtensionKey("x-custom field")).toBe(true);
    });

    it("应该正确处理边界情况", () => {
      expect(isExtensionKey("x-a")).toBe(true);
      expect(isExtensionKey("x-1")).toBe(true);
      expect(isExtensionKey("x--")).toBe(true);
      expect(isExtensionKey("x-_")).toBe(true);
    });

    it("应该正确处理常见的 OpenAPI 扩展键", () => {
      expect(isExtensionKey("x-amazon-apigateway-integration")).toBe(true);
      expect(isExtensionKey("x-swagger-router-controller")).toBe(true);
      expect(isExtensionKey("x-codegen-request-body-name")).toBe(true);
      expect(isExtensionKey("x-nullable")).toBe(true);
      expect(isExtensionKey("x-enum-varnames")).toBe(true);
    });
  });
});
