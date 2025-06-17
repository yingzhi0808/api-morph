import { describe, expect, it } from "vitest";
import { CallbackBuilder } from "./CallbackBuilder";

describe("CallbackBuilder", () => {
  describe("constructor and build", () => {
    it("应该创建默认的回调对象", () => {
      const builder = new CallbackBuilder();
      const result = builder.build();

      expect(result).toEqual({});
    });

    it("多次调用 build 应该返回不同的对象引用", () => {
      const builder = new CallbackBuilder();
      builder.addExpression("{$request.query.callbackUrl}", {});

      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2);
    });
  });

  describe("addExpression", () => {
    it("应该添加回调表达式", () => {
      const builder = new CallbackBuilder();
      const pathItem = { summary: "Webhook回调" };
      const result = builder.addExpression("{$request.query.callbackUrl}", pathItem).build();

      expect(result).toEqual({
        "{$request.query.callbackUrl}": pathItem,
      });
    });

    it("应该添加多个回调表达式", () => {
      const builder = new CallbackBuilder();
      const pathItem1 = { summary: "支付回调" };
      const pathItem2 = { summary: "订单回调" };
      const result = builder
        .addExpression("{$request.body#/paymentCallback}", pathItem1)
        .addExpression("{$request.body#/orderCallback}", pathItem2)
        .build();

      expect(result).toEqual({
        "{$request.body#/paymentCallback}": pathItem1,
        "{$request.body#/orderCallback}": pathItem2,
      });
    });

    it("不应该覆盖已存在的表达式", () => {
      const builder = new CallbackBuilder();
      const pathItem1 = { summary: "第一个回调" };
      const pathItem2 = { summary: "第二个回调" };
      const result = builder
        .addExpression("{$request.query.callback}", pathItem1)
        .addExpression("{$request.query.callback}", pathItem2)
        .build();

      expect(result).toEqual({
        "{$request.query.callback}": pathItem1,
      });
    });

    it("应该支持链式调用", () => {
      const builder = new CallbackBuilder();
      const returnValue = builder.addExpression("{$request.query.callback}", {});

      expect(returnValue).toBe(builder);
    });
  });

  describe("addExtension", () => {
    it("应该添加扩展字段", () => {
      const builder = new CallbackBuilder();
      const result = builder.addExtension("x-custom-field", "custom-value").build();

      expect(result).toEqual({
        "x-custom-field": "custom-value",
      });
    });

    it("应该添加多个扩展字段", () => {
      const builder = new CallbackBuilder();
      const result = builder
        .addExtension("x-region", "us-east-1")
        .addExtension("x-timeout", 30000)
        .addExtension("x-retry", true)
        .build();

      expect(result).toEqual({
        "x-region": "us-east-1",
        "x-timeout": 30000,
        "x-retry": true,
      });
    });

    it("不应该覆盖已存在的扩展字段", () => {
      const builder = new CallbackBuilder();
      const result = builder
        .addExtension("x-custom", "原始值")
        .addExtension("x-custom", "新值")
        .build();

      expect(result).toEqual({
        "x-custom": "原始值",
      });
    });

    it("应该支持链式调用", () => {
      const builder = new CallbackBuilder();
      const returnValue = builder.addExtension("x-test", "value");

      expect(returnValue).toBe(builder);
    });
  });
});
