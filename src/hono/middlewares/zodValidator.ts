import { zValidator as zv } from "@hono/zod-validator";
import { getCallLocation, SchemaRegistry } from "@/registry/SchemaRegistry";

/**
 * 包装官方的 `@hono/zod-validator`，行为完全与官方 `zValidator` 一致，
 * 只是会额外收集 schema 信息用于 OpenAPI 文档生成
 */
// @ts-expect-error 类型系统过于复杂，但运行时行为完全一致
export const zodValidator: typeof zv = (target, schema, hook, options) => {
  const location = getCallLocation();
  const registry = SchemaRegistry.getInstance();
  const schemaInfo: Record<string, unknown> = {};

  switch (target) {
    case "json":
      schemaInfo.body = schema;
      break;
    case "query":
      schemaInfo.query = schema;
      break;
    case "param":
      schemaInfo.params = schema;
      break;
    case "header":
      schemaInfo.headers = schema;
      break;
    case "form":
      schemaInfo.body = schema;
      break;
  }

  registry.register(location, schemaInfo);

  return zv(target, schema, hook, options);
};
