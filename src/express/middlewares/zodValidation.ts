import type { NextFunction, Request, RequestHandler, Response } from "express";
import express from "express";
import type { ZodError, ZodObject, ZodType, z } from "zod/v4";

// 处理 Express 5 中 req.query 只读的问题
const descriptor = Object.getOwnPropertyDescriptor(express.request, "query");
if (descriptor) {
  Object.defineProperty(express.request, "query", {
    get(this: Request) {
      const req = this as Request & { _query?: unknown };
      if (req._query) {
        return req._query;
      }
      return descriptor?.get?.call(this);
    },
    set(this: Request, query: unknown) {
      const req = this as Request & { _query?: unknown };
      req._query = query;
    },
    configurable: true,
    enumerable: true,
  });
}

/**
 * 校验配置选项
 */
export interface ValidationOptions<
  TParams extends ZodType = ZodType,
  TQuery extends ZodType = ZodType,
  TBody extends ZodType = ZodType,
  THeaders extends ZodType = ZodType,
> {
  /** 请求体 schema */
  body?: TBody;
  /** 查询参数 schema */
  query?: TQuery;
  /** 路径参数 schema */
  params?: TParams;
  /** 请求头 schema */
  headers?: THeaders;
  /** 自定义错误处理函数 */
  onError?: ErrorRequestHandler;
}

/**
 * 错误请求处理函数
 */
export type ErrorRequestHandler<
  P = unknown,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = (
  err: ZodError,
  req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction,
) => void | Promise<void>;

/**
 * 默认错误处理函数
 */
const defaultErrorHandler: ErrorRequestHandler = (error, _req, res) => {
  res.status(400).json(error);
};

/**
 * 创建类型安全的 Zod 校验中间件
 */
export function validateRequest<
  TParams extends ZodObject = ZodObject,
  TQuery extends ZodObject = ZodObject,
  TBody extends ZodObject = ZodObject,
  THeaders extends ZodObject = ZodObject,
>(
  options: ValidationOptions<TParams, TQuery, TBody, THeaders>,
): RequestHandler<z.output<TParams>, unknown, z.output<TBody>, z.output<TQuery>> {
  const { body, query, params, headers, onError = defaultErrorHandler } = options;

  return async (req, res, next) => {
    // 校验请求体
    if (body) {
      const result = await body.safeParseAsync(req.body);
      if (result.success) {
        req.body = result.data;
      } else {
        onError(result.error, req, res, next);
        return;
      }
    }

    // 校验查询参数
    if (query) {
      const result = await query.safeParseAsync(req.query);
      if (result.success) {
        (req as Request & { _query?: unknown })._query = result.data;
        Object.assign(req.query, result.data);
      } else {
        onError(result.error, req, res, next);
        return;
      }
    }

    // 校验路径参数
    if (params) {
      const result = await params.safeParseAsync(req.params);
      if (result.success) {
        Object.assign(req.params, result.data);
      } else {
        onError(result.error, req, res, next);
        return;
      }
    }

    // 校验请求头
    if (headers) {
      const result = await headers.safeParseAsync(req.headers);
      if (result.success) {
        Object.assign(req.headers, result.data);
      } else {
        onError(result.error, req, res, next);
        return;
      }
    }

    next();
  };
}
