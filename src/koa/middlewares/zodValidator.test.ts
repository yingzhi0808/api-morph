import type { Next } from "koa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import type { ErrorRequestHandler, TypedMiddleware, ValidationOptions } from "./zodValidator";
import { zodValidator } from "./zodValidator";

describe("zodValidator", () => {
  let mockContext: Parameters<TypedMiddleware>[0];
  let mockNext: Next;

  beforeEach(() => {
    mockContext = {
      request: {
        body: {},
      },
      query: {},
      params: {},
      headers: {},
      status: 200,
      body: null,
    } as unknown as Parameters<TypedMiddleware>[0];
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("zodValidator 中间件创建", () => {
    it("应该创建有效的中间件函数", () => {
      const options: ValidationOptions = {};
      const middleware = zodValidator(options);

      expect(typeof middleware).toBe("function");
      expect(middleware.length).toBe(2); // (ctx, next)
    });

    it("应该在没有校验规则时直接调用next", async () => {
      const options: ValidationOptions = {};
      const middleware = zodValidator(options);

      await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe("body 校验", () => {
    const bodySchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it("应该成功校验请求体", async () => {
      const options: ValidationOptions = { body: bodySchema };
      const middleware = zodValidator(options);

      mockContext.request.body = { name: "John", age: 25 };

      await middleware(mockContext, mockNext);

      expect(mockContext.request.body).toEqual({ name: "John", age: 25 });
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("应该在请求体校验失败时调用错误处理函数", async () => {
      const options: ValidationOptions = { body: bodySchema };
      const middleware = zodValidator(options);

      mockContext.request.body = { name: "John" }; // 缺少 age 字段

      await middleware(mockContext, mockNext);

      expect(mockContext.status).toBe(400);
      expect(mockContext.body).toEqual(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ["age"],
              message: expect.any(String),
            }),
          ]),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("应该使用自定义错误处理函数处理请求体校验失败", async () => {
      const customErrorHandler: ErrorRequestHandler = vi.fn();
      const options: ValidationOptions = {
        body: bodySchema,
        onError: customErrorHandler,
      };
      const middleware = zodValidator(options);

      mockContext.request.body = { name: "John" }; // 缺少 age 字段

      await middleware(mockContext, mockNext);

      expect(customErrorHandler).toHaveBeenCalledTimes(1);
      expect(customErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: expect.any(Array),
        }),
        mockContext,
        mockNext,
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("query 校验", () => {
    const querySchema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    });

    it("应该成功校验查询参数", async () => {
      const options: ValidationOptions = { query: querySchema };
      const middleware = zodValidator(options);

      mockContext.query = { page: "1", limit: "10" };

      await middleware(mockContext, mockNext);

      expect(mockContext.query).toEqual(expect.objectContaining({ page: "1", limit: "10" }));
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("应该在查询参数校验失败时调用错误处理函数", async () => {
      const strictQuerySchema = z.object({
        page: z.string(),
        limit: z.string(),
      });
      const options: ValidationOptions = { query: strictQuerySchema };
      const middleware = zodValidator(options);

      mockContext.query = { page: "1" }; // 缺少 limit 字段

      await middleware(mockContext, mockNext);

      expect(mockContext.status).toBe(400);
      expect(mockContext.body).toEqual(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ["limit"],
              message: expect.any(String),
            }),
          ]),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("应该正确更新查询参数对象", async () => {
      const options: ValidationOptions = { query: querySchema };
      const middleware = zodValidator(options);

      mockContext.query = { page: "1", limit: "10", extra: "ignored" };

      await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("params 校验", () => {
    const paramsSchema = z.object({
      id: z.string(),
      userId: z.string().optional(),
    });

    it("应该成功校验路径参数", async () => {
      const options: ValidationOptions = { params: paramsSchema };
      const middleware = zodValidator(options);

      mockContext.params = { id: "123", userId: "456" };

      await middleware(mockContext, mockNext);

      expect(mockContext.params).toEqual(expect.objectContaining({ id: "123", userId: "456" }));
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("应该在路径参数校验失败时调用错误处理函数", async () => {
      const options: ValidationOptions = { params: paramsSchema };
      const middleware = zodValidator(options);

      mockContext.params = {}; // 缺少必需的 id 字段

      await middleware(mockContext, mockNext);

      expect(mockContext.status).toBe(400);
      expect(mockContext.body).toEqual(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ["id"],
              message: expect.any(String),
            }),
          ]),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("headers 校验", () => {
    const headersSchema = z.object({
      authorization: z.string(),
      "x-api-version": z.string().optional(),
    });

    it("应该成功校验请求头", async () => {
      const options: ValidationOptions = { headers: headersSchema };
      const middleware = zodValidator(options);

      mockContext.headers = {
        authorization: "Bearer token",
        "x-api-version": "1.0",
      };

      await middleware(mockContext, mockNext);

      expect(mockContext.headers).toEqual(
        expect.objectContaining({
          authorization: "Bearer token",
          "x-api-version": "1.0",
        }),
      );
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("应该在请求头校验失败时调用错误处理函数", async () => {
      const options: ValidationOptions = { headers: headersSchema };
      const middleware = zodValidator(options);

      mockContext.headers = {}; // 缺少必需的 authorization 字段

      await middleware(mockContext, mockNext);

      expect(mockContext.status).toBe(400);
      expect(mockContext.body).toEqual(
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ["authorization"],
              message: expect.any(String),
            }),
          ]),
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
