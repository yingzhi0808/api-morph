import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { JSDocTagName } from "@/constants";
import { CallbackTagParser } from "./CallbackTagParser";

describe("CallbackTagParser", () => {
  let parser: CallbackTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new CallbackTagParser(context);
  });

  describe("基本属性", () => {
    it("应该有正确的支持标签列表", () => {
      expect(parser.tags).toEqual([JSDocTagName.CALLBACK]);
    });
  });

  describe("parse", () => {
    describe("回调名称验证", () => {
      it("应该接受有效的驼峰命名回调名称", async () => {
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

      it("应该接受有效的下划线命名回调名称", async () => {
        const tag = createJSDocTag(`@callback payment_success_notify
        x-provider: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "payment_success_notify",
            callback: {
              "x-provider": "test",
            },
          },
        });
      });

      it("应该接受以下划线开头的回调名称", async () => {
        const tag = createJSDocTag(`@callback _privateCallback
        x-provider: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "_privateCallback",
            callback: {
              "x-provider": "test",
            },
          },
        });
      });

      it("应该接受包含数字的回调名称", async () => {
        const tag = createJSDocTag(`@callback callback123
        x-provider: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "callback123",
            callback: {
              "x-provider": "test",
            },
          },
        });
      });

      it("应该接受短回调名称", async () => {
        const tag = createJSDocTag(`@callback cb
        x-provider: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "cb",
            callback: {
              "x-provider": "test",
            },
          },
        });
      });
    });

    describe("YAML 格式解析", () => {
      it("应该正确解析表达式配置", async () => {
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

      it("应该正确解析扩展字段配置", async () => {
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

      it("应该正确解析表达式 + 扩展字段的混合配置", async () => {
        const tag = createJSDocTag(`@callback orderNotificationCallback
        "{$request.body#/successCallback}":
          post:
            summary: "订单成功回调"
            requestBody:
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      orderId:
                        type: string
                      status:
                        type: string
            responses:
              200:
                description: "处理成功"
        "{$request.body#/failureCallback}":
          post:
            summary: "订单失败回调"
            responses:
              200:
                description: "处理失败"
        "https://fallback.example.com/webhook":
          post:
            summary: "备用回调地址"
        x-provider: "custom"
        x-timeout: 30000
        x-retry-policy:
          maxRetries: 3
          backoffMs: 1000`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "orderNotificationCallback",
            callback: {
              "{$request.body#/successCallback}": {
                post: {
                  summary: "订单成功回调",
                  requestBody: {
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            orderId: {
                              type: "string",
                            },
                            status: {
                              type: "string",
                            },
                          },
                        },
                      },
                    },
                  },
                  responses: {
                    200: {
                      description: "处理成功",
                    },
                  },
                },
              },
              "{$request.body#/failureCallback}": {
                post: {
                  summary: "订单失败回调",
                  responses: {
                    200: {
                      description: "处理失败",
                    },
                  },
                },
              },
              "https://fallback.example.com/webhook": {
                post: {
                  summary: "备用回调地址",
                },
              },
              "x-provider": "custom",
              "x-timeout": 30000,
              "x-retry-policy": {
                maxRetries: 3,
                backoffMs: 1000,
              },
            },
          },
        });
      });

      it("应该正确解析多个表达式配置", async () => {
        const tag = createJSDocTag(`@callback multiExpressionCallback
        "{$request.body#/webhook1}":
          post:
            summary: "第一个回调"
        "{$request.body#/webhook2}":
          put:
            summary: "第二个回调"
        "https://static.example.com/webhook":
          post:
            summary: "静态回调地址"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "multiExpressionCallback",
            callback: {
              "{$request.body#/webhook1}": {
                post: {
                  summary: "第一个回调",
                },
              },
              "{$request.body#/webhook2}": {
                put: {
                  summary: "第二个回调",
                },
              },
              "https://static.example.com/webhook": {
                post: {
                  summary: "静态回调地址",
                },
              },
            },
          },
        });
      });

      it("应该正确解析只有扩展字段的配置", async () => {
        const tag = createJSDocTag(`@callback metadataCallback
        x-provider: "custom"
        x-version: "2.0"
        x-metadata:
          team: "backend"
          contact: "backend@example.com"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "metadataCallback",
            callback: {
              "x-provider": "custom",
              "x-version": "2.0",
              "x-metadata": {
                team: "backend",
                contact: "backend@example.com",
              },
            },
          },
        });
      });
    });

    describe("错误处理", () => {
      it("应该在没有参数且没有 YAML 时抛出错误", async () => {
        const tag = createJSDocTag("@callback");
        await expect(parser.parse(tag)).rejects.toThrow(/@callback 标签 callbackName 不能为空/);
      });

      it("应该在没有回调名称时抛出错误", async () => {
        const tag = createJSDocTag(`@callback
        x-provider: "test"`);
        await expect(parser.parse(tag)).rejects.toThrow(/@callback 标签 callbackName 不能为空/);
      });

      it("应该在没有 YAML 参数时抛出错误", async () => {
        const tag = createJSDocTag("@callback paymentNotify");
        await expect(parser.parse(tag)).rejects.toThrow(/@callback 标签必须包含 YAML 参数/);
      });

      it("应该在回调名称格式无效时抛出错误", async () => {
        const tag = createJSDocTag(`@callback 123invalid
        x-provider: "test"`);
        await expect(parser.parse(tag)).rejects.toThrow(
          /@callback 标签 callbackName 格式不正确："123invalid"，必须是有效的标识符/,
        );
      });

      it("应该在回调名称包含特殊字符时抛出错误", async () => {
        const tag = createJSDocTag(`@callback payment-notify
        x-provider: "test"`);
        await expect(parser.parse(tag)).rejects.toThrow(
          /@callback 标签 callbackName 格式不正确："payment-notify"，必须是有效的标识符/,
        );
      });

      it("应该在回调名称包含空格时正确解析为两个参数（第二个参数会被忽略）", async () => {
        const tag = createJSDocTag(`@callback payment notify
        x-provider: "test"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "payment",
            callback: {
              "x-provider": "test",
            },
          },
        });
      });

      it("应该在回调名称以数字开头时抛出错误", async () => {
        const tag = createJSDocTag(`@callback 1callback
        x-provider: "test"`);
        await expect(parser.parse(tag)).rejects.toThrow(
          /@callback 标签 callbackName 格式不正确："1callback"，必须是有效的标识符/,
        );
      });
    });

    describe("边界情况", () => {
      it("应该正确处理复杂表达式", async () => {
        const tag = createJSDocTag(`@callback complexCallback
        "{$request.body#/payment/notification/url}":
          post:
            summary: "复杂表达式回调"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "complexCallback",
            callback: {
              "{$request.body#/payment/notification/url}": {
                post: {
                  summary: "复杂表达式回调",
                },
              },
            },
          },
        });
      });

      it("应该正确处理多个HTTP方法的表达式", async () => {
        const tag = createJSDocTag(`@callback multiMethodCallback
        "{$request.body#/webhook}":
          post:
            summary: "POST回调"
          put:
            summary: "PUT回调"
          patch:
            summary: "PATCH回调"`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "multiMethodCallback",
            callback: {
              "{$request.body#/webhook}": {
                post: {
                  summary: "POST回调",
                },
                put: {
                  summary: "PUT回调",
                },
                patch: {
                  summary: "PATCH回调",
                },
              },
            },
          },
        });
      });

      it("应该正确处理扩展字段的不同数据类型", async () => {
        const tag = createJSDocTag(`@callback typedCallback
        x-timeout: 30000
        x-enabled: true
        x-version: 1.2
        x-custom: null`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "typedCallback",
            callback: {
              "x-timeout": 30000,
              "x-enabled": true,
              "x-version": 1.2,
              "x-custom": null,
            },
          },
        });
      });

      it("应该正确处理空对象的扩展字段", async () => {
        const tag = createJSDocTag(`@callback emptyObjectCallback
        x-config: {}`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "emptyObjectCallback",
            callback: {
              "x-config": {},
            },
          },
        });
      });

      it("应该正确处理数组类型的扩展字段", async () => {
        const tag = createJSDocTag(`@callback arrayCallback
        x-tags: ["webhook", "callback", "async"]
        x-methods: ["POST", "PUT"]`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "arrayCallback",
            callback: {
              "x-tags": ["webhook", "callback", "async"],
              "x-methods": ["POST", "PUT"],
            },
          },
        });
      });
    });

    describe("真实场景测试", () => {
      it("应该正确解析支付回调场景", async () => {
        const tag = createJSDocTag(`@callback paymentNotification
        "{$request.body#/notifyUrl}":
          post:
            summary: "支付结果异步通知"
            requestBody:
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      orderId:
                        type: string
                      amount:
                        type: number
                      status:
                        type: string
                        enum: ["success", "failed"]
            responses:
              200:
                description: "处理成功"
        x-provider: "alipay"
        x-signature-required: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "paymentNotification",
            callback: {
              "{$request.body#/notifyUrl}": {
                post: {
                  summary: "支付结果异步通知",
                  requestBody: {
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            orderId: {
                              type: "string",
                            },
                            amount: {
                              type: "number",
                            },
                            status: {
                              type: "string",
                              enum: ["success", "failed"],
                            },
                          },
                        },
                      },
                    },
                  },
                  responses: {
                    200: {
                      description: "处理成功",
                    },
                  },
                },
              },
              "x-provider": "alipay",
              "x-signature-required": true,
            },
          },
        });
      });

      it("应该正确解析订单状态回调场景", async () => {
        const tag = createJSDocTag(`@callback orderStatusNotification
        "{$request.body#/orderStatusCallback}":
          post:
            summary: "订单状态变更通知"
            requestBody:
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      orderId:
                        type: string
                      status:
                        type: string
                        enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"]
                      timestamp:
                        type: string
                        format: date-time
            responses:
              200:
                description: "处理成功"
              400:
                description: "请求参数错误"
        x-callback-type: "order-status"
        x-retry-policy:
          maxRetries: 3
          backoffMs: 1000`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "orderStatusNotification",
            callback: {
              "{$request.body#/orderStatusCallback}": {
                post: {
                  summary: "订单状态变更通知",
                  requestBody: {
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            orderId: {
                              type: "string",
                            },
                            status: {
                              type: "string",
                              enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
                            },
                            timestamp: {
                              type: "string",
                              format: "date-time",
                            },
                          },
                        },
                      },
                    },
                  },
                  responses: {
                    200: {
                      description: "处理成功",
                    },
                    400: {
                      description: "请求参数错误",
                    },
                  },
                },
              },
              "x-callback-type": "order-status",
              "x-retry-policy": {
                maxRetries: 3,
                backoffMs: 1000,
              },
            },
          },
        });
      });

      it("应该正确解析 Webhook 多回调场景", async () => {
        const tag = createJSDocTag(`@callback webhookNotifications
        "{$request.body#/webhooks/success}":
          post:
            summary: "成功回调"
            description: "操作成功时的回调通知"
            requestBody:
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      event:
                        type: string
                      data:
                        type: object
        "{$request.body#/webhooks/error}":
          post:
            summary: "错误回调"
            description: "操作失败时的回调通知"
        "https://fallback.example.com/webhook":
          post:
            summary: "备用回调"
            description: "当用户提供的回调地址不可用时的备用方案"
        x-webhook-version: "1.0"
        x-signature-header: "X-Webhook-Signature"
        x-timeout: 30000`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "webhookNotifications",
            callback: {
              "{$request.body#/webhooks/success}": {
                post: {
                  summary: "成功回调",
                  description: "操作成功时的回调通知",
                  requestBody: {
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            event: {
                              type: "string",
                            },
                            data: {
                              type: "object",
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              "{$request.body#/webhooks/error}": {
                post: {
                  summary: "错误回调",
                  description: "操作失败时的回调通知",
                },
              },
              "https://fallback.example.com/webhook": {
                post: {
                  summary: "备用回调",
                  description: "当用户提供的回调地址不可用时的备用方案",
                },
              },
              "x-webhook-version": "1.0",
              "x-signature-header": "X-Webhook-Signature",
              "x-timeout": 30000,
            },
          },
        });
      });

      it("应该正确解析微服务回调场景", async () => {
        const tag = createJSDocTag(`@callback microserviceCallback
        "{$request.body#/callbackEndpoint}":
          post:
            summary: "微服务间回调"
            description: "服务间异步通信回调"
            requestBody:
              content:
                application/json:
                  schema:
                    type: object
                    properties:
                      serviceId:
                        type: string
                      correlationId:
                        type: string
                      payload:
                        type: object
            responses:
              200:
                description: "回调处理成功"
              500:
                description: "回调处理失败"
        x-service-type: "microservice"
        x-correlation-required: true
        x-authentication:
          type: "bearer"
          required: true`);
        const result = await parser.parse(tag);
        expect(result).toEqual({
          callback: {
            name: "microserviceCallback",
            callback: {
              "{$request.body#/callbackEndpoint}": {
                post: {
                  summary: "微服务间回调",
                  description: "服务间异步通信回调",
                  requestBody: {
                    content: {
                      "application/json": {
                        schema: {
                          type: "object",
                          properties: {
                            serviceId: {
                              type: "string",
                            },
                            correlationId: {
                              type: "string",
                            },
                            payload: {
                              type: "object",
                            },
                          },
                        },
                      },
                    },
                  },
                  responses: {
                    200: {
                      description: "回调处理成功",
                    },
                    500: {
                      description: "回调处理失败",
                    },
                  },
                },
              },
              "x-service-type": "microservice",
              "x-correlation-required": true,
              "x-authentication": {
                type: "bearer",
                required: true,
              },
            },
          },
        });
      });
    });
  });
});
