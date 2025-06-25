import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { CallbackTagParser } from "./CallbackTagParser";

describe("CallbackTagParser", () => {
  let parser: CallbackTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new CallbackTagParser(context);
  });

  describe("properties", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual(["callback"]);
    });
  });

  describe("parse", () => {
    it("应该正确解析 @deprecated 标签", async () => {
      const tag = createJSDocTag(`@callback webhookNotificationCallback
        x-provider: "test"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        callback: {
          name: "webhookNotificationCallback",
          callback: {
            "x-provider": "test",
          },
        },
      });
    });

    it("应该在没有回调名称时抛出错误", async () => {
      const tag = createJSDocTag(`@callback
        x-provider: "test"`);
      await expect(parser.parse(tag)).rejects.toThrow(/@callback 标签 callbackName 不能为空/);
    });

    it("应该正确解析表达式参数", async () => {
      const tag = createJSDocTag(`@callback paymentNotify
        "{$request.body#/callbackUrl}":
          post:
            summary: "支付回调"
            responses:
              200:
                description: "处理成功"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        callback: {
          name: "paymentNotify",
          callback: {
            "{$request.body#/callbackUrl}": {
              post: {
                summary: "支付回调",
                responses: {
                  200: {
                    description: "处理成功",
                  },
                },
              },
            },
          },
        },
      });
    });

    it("应该正确解析扩展字段参数", async () => {
      const tag = createJSDocTag(`@callback webhookCallback
        x-provider: "stripe"
        x-timeout: 30000
        x-retry-count: 3`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        callback: {
          name: "webhookCallback",
          callback: {
            "x-provider": "stripe",
            "x-timeout": 30000,
            "x-retry-count": 3,
          },
        },
      });
    });

    it("应该正确解析 ReferenceObject", async () => {
      const tag = createJSDocTag(`@callback orderStatusCallback
        $ref: "#/components/callbacks/OrderStatusChanged"`);
      const result = await parser.parse(tag);
      expect(result).toEqual({
        callback: {
          name: "orderStatusCallback",
          callback: {
            $ref: "#/components/callbacks/OrderStatusChanged",
          },
        },
      });
    });

    it("应该在没有 YAML 参数时抛出错误", async () => {
      const tag = createJSDocTag("@callback paymentNotify");
      await expect(parser.parse(tag)).rejects.toThrow(/@callback 标签必须包含 YAML 参数/);
    });
  });
});
