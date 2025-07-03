import type { ZodType } from "zod/v4";
import { z } from "zod/v4";
import type { JSONSchema } from "zod/v4/core";

/**
 * Schema 信息接口
 */
export interface SchemaInfo {
  /** 调用位置（文件路径:行号） */
  location: string;
  /** 各类型的 JSON Schema */
  schemas: {
    body?: JSONSchema.BaseSchema;
    query?: JSONSchema.BaseSchema;
    params?: JSONSchema.BaseSchema;
    headers?: JSONSchema.BaseSchema;
  };
}

/**
 * Schema 注册中心，管理运行时收集的 Zod Schema 信息
 */
export class SchemaRegistry {
  private static instance: SchemaRegistry;
  private schemas = new Map<string, SchemaInfo>();

  /**
   * 获取单例实例
   */
  static getInstance() {
    if (!SchemaRegistry.instance) {
      SchemaRegistry.instance = new SchemaRegistry();
    }
    return SchemaRegistry.instance;
  }

  /**
   * 注册 Schema 信息
   * @param location 调用位置（文件路径:行号）
   * @param schemas Schema 对象
   */
  register(
    location: string,
    schemas: {
      body?: ZodType;
      query?: ZodType;
      params?: ZodType;
      headers?: ZodType;
    },
  ) {
    const schemaInfo: SchemaInfo = {
      location,
      schemas: {},
    };

    // 转换 Zod Schema 为 JSON Schema
    if (schemas.body) {
      schemaInfo.schemas.body = z.toJSONSchema(schemas.body);
    }
    if (schemas.query) {
      schemaInfo.schemas.query = z.toJSONSchema(schemas.query);
    }
    if (schemas.params) {
      schemaInfo.schemas.params = z.toJSONSchema(schemas.params);
    }
    if (schemas.headers) {
      schemaInfo.schemas.headers = z.toJSONSchema(schemas.headers);
    }

    // 使用位置作为 key 存储到内存
    this.schemas.set(location, schemaInfo);
  }

  /**
   * 根据位置获取 Schema 信息
   * @param location 文件位置（文件路径:行号）
   * @returns Schema 信息
   */
  get(location: string) {
    return this.schemas.get(location);
  }

  /**
   * 清空所有已注册的 Schema
   */
  clear() {
    this.schemas.clear();
  }
}

/**
 * 获取调用栈中的调用位置信息
 * @param skipFrames 跳过的栈帧数量
 * @returns 调用位置字符串（文件路径:行号）
 */
export function getCallLocation(skipFrames = 3) {
  const stack = new Error().stack;
  if (!stack) {
    return "unknown";
  }

  const lines = stack.split("\n");

  for (let i = skipFrames; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.includes("at ") &&
      !line.includes("zodValidator") &&
      !line.includes("SchemaRegistry")
    ) {
      // 匹配不同的栈帧格式
      const patterns = [
        /at .* \((.+):(\d+):(\d+)\)/, // at function (file:line:col)
        /at (.+):(\d+):(\d+)/, // at file:line:col
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match?.[1] && match[2]) {
          return `${match[1]}:${match[2]}`;
        }
      }
    }
  }

  return "unknown";
}
