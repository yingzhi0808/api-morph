import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import z from "zod/v4";
import type { ErrorRequestHandler, ValidationOptions } from "./zodValidator";
import { zodValidator } from "./zodValidator";

describe("zodValidator", () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {},
      headers: {},
    } as Request;
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
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
      expect(middleware.length).toBe(3); // (req, res, next)
    });

    it("应该在没有校验规则时直接调用next", async () => {
      const options: ValidationOptions = {};
      const middleware = zodValidator(options);

      await middleware(mockRequest, mockResponse, mockNext);

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

      mockRequest.body = { name: "John", age: 25 };

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.body).toEqual({ name: "John", age: 25 });
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("应该在请求体校验失败时调用错误处理函数", async () => {
      const options: ValidationOptions = { body: bodySchema };
      const middleware = zodValidator(options);

      mockRequest.body = { name: "John" }; // 缺少 age 字段

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
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

      mockRequest.body = { name: "John" }; // 缺少 age 字段

      await middleware(mockRequest, mockResponse, mockNext);

      expect(customErrorHandler).toHaveBeenCalledTimes(1);
      expect(customErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          issues: expect.any(Array),
        }),
        mockRequest,
        mockResponse,
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

      mockRequest.query = { page: "1", limit: "10" };

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.query).toEqual({ page: "1", limit: "10" });
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

      mockRequest.query = { page: "1" }; // 缺少 limit 字段

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
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

      const req = mockRequest;
      req.query = { page: "1", limit: "10", extra: "ignored" };

      await middleware(req, mockResponse, mockNext);

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

      mockRequest.params = { id: "123", userId: "456" };

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.params).toEqual({ id: "123", userId: "456" });
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("应该在路径参数校验失败时调用错误处理函数", async () => {
      const options: ValidationOptions = { params: paramsSchema };
      const middleware = zodValidator(options);

      mockRequest.params = {}; // 缺少必需的 id 字段

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
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
      "content-type": z.string().optional(),
    });

    it("应该成功校验请求头", async () => {
      const options: ValidationOptions = { headers: headersSchema };
      const middleware = zodValidator(options);

      mockRequest.headers = {
        authorization: "Bearer token123",
        "content-type": "application/json",
      };

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockRequest.headers).toEqual({
        authorization: "Bearer token123",
        "content-type": "application/json",
      });
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("应该在请求头校验失败时调用错误处理函数", async () => {
      const options: ValidationOptions = { headers: headersSchema };
      const middleware = zodValidator(options);

      mockRequest.headers = {}; // 缺少必需的 authorization 字段

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
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
