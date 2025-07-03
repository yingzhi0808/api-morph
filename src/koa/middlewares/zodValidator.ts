import type { Context, Next } from "koa";
import type { ZodError, ZodType, z } from "zod/v4";
import { getCallLocation, SchemaRegistry } from "@/registry/SchemaRegistry";

/**
 * 类型化的Koa中间件函数，提供类型安全的ctx参数
 */
export type TypedMiddleware<
  TParams = unknown,
  TQuery = unknown,
  TBody = unknown,
  THeaders = unknown,
> = (
  ctx: Context & {
    params: TParams;
    query: TQuery;
    headers: THeaders;
    request: Omit<Context["request"], "query" | "headers" | "body"> & {
      query: TQuery;
      headers: THeaders;
      body: TBody;
    };
  },
  next: Next,
) => Promise<void>;

/**
 * Koa 校验配置选项
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
 * Koa 错误请求处理函数
 */
export type ErrorRequestHandler = (err: ZodError, ctx: Context, next: Next) => void | Promise<void>;

/**
 * 默认错误处理函数
 */
const defaultErrorHandler: ErrorRequestHandler = (error, ctx) => {
  ctx.status = 400;
  ctx.body = error;
};

/**
 * 创建类型安全的 Koa Zod 校验中间件
 *
 * @param options 校验配置选项
 * @returns 类型化的Koa中间件，提供对应schema字段的类型提示
 */
export function zodValidator<
  TParams extends ZodType,
  TQuery extends ZodType,
  TBody extends ZodType,
  THeaders extends ZodType,
>(
  options: ValidationOptions<TParams, TQuery, TBody, THeaders>,
): TypedMiddleware<z.output<TParams>, z.output<TQuery>, z.output<TBody>, z.output<THeaders>> {
  const { body, query, params, headers, onError = defaultErrorHandler } = options;

  // 获取调用位置
  const location = getCallLocation();
  const registry = SchemaRegistry.getInstance();

  // 注册 Schema 信息，直接使用位置作为 key
  registry.register(location, {
    body,
    query,
    params,
    headers,
  });

  return async (ctx, next) => {
    // 校验请求体
    if (body) {
      const result = await body.safeParseAsync(ctx.request.body);
      if (result.success) {
        // @ts-ignore
        ctx.request.body = result.data;
      } else {
        // @ts-ignore
        await onError(result.error, ctx, next);
        return;
      }
    }

    // 校验查询参数
    if (query) {
      const result = await query.safeParseAsync(ctx.query);
      if (result.success) {
        // @ts-ignore
        ctx.query = result.data;
      } else {
        // @ts-ignore
        await onError(result.error, ctx, next);
        return;
      }
    }

    // 校验路径参数
    if (params) {
      const result = await params.safeParseAsync(ctx.params);
      if (result.success) {
        // @ts-ignore
        ctx.params = result.data;
      } else {
        // @ts-ignore
        await onError(result.error, ctx, next);
        return;
      }
    }

    // 校验请求头
    if (headers) {
      const result = await headers.safeParseAsync(ctx.headers);
      if (result.success) {
        // @ts-ignore
        ctx.headers = result.data;
      } else {
        // @ts-ignore
        await onError(result.error, ctx, next);
        return;
      }
    }

    await next();
  };
}
