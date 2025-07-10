import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import { SchemaRegistry } from "@/registry/SchemaRegistry";
import { zodValidator } from "./zodValidator";

vi.mock("@hono/zod-validator", () => ({
  zValidator: vi.fn(() => {
    return async (_c: unknown, next: () => Promise<void>) => {
      await next();
    };
  }),
}));

vi.mock("@/registry/SchemaRegistry", async () => {
  const actual = await vi.importActual("@/registry/SchemaRegistry");
  return {
    ...actual,
    getCallLocation: vi.fn(() => "test-file.ts:10"),
  };
});

describe("zodValidator", () => {
  let schemaRegistry: SchemaRegistry;

  beforeEach(() => {
    schemaRegistry = SchemaRegistry.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    schemaRegistry.clear();
  });

  it("应该为 json target 收集 body schema", () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    zodValidator("json", testSchema);

    const registeredSchema = schemaRegistry.get("test-file.ts:10");
    expect(registeredSchema).toBeDefined();
    expect(registeredSchema?.schemas.body).toBeDefined();
    expect(registeredSchema?.location).toBe("test-file.ts:10");
  });

  it("应该为 query target 收集 query schema", () => {
    const querySchema = z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    });

    zodValidator("query", querySchema);

    const registeredSchema = schemaRegistry.get("test-file.ts:10");
    expect(registeredSchema).toBeDefined();
    expect(registeredSchema?.schemas.query).toBeDefined();
    expect(registeredSchema?.location).toBe("test-file.ts:10");
  });

  it("应该为 param target 收集 params schema", () => {
    const paramsSchema = z.object({
      id: z.string(),
      userId: z.string().optional(),
    });

    zodValidator("param", paramsSchema);

    const registeredSchema = schemaRegistry.get("test-file.ts:10");
    expect(registeredSchema).toBeDefined();
    expect(registeredSchema?.schemas.params).toBeDefined();
    expect(registeredSchema?.location).toBe("test-file.ts:10");
  });

  it("应该为 header target 收集 headers schema", () => {
    const headersSchema = z.object({
      authorization: z.string(),
      "content-type": z.string().optional(),
    });

    zodValidator("header", headersSchema);

    const registeredSchema = schemaRegistry.get("test-file.ts:10");
    expect(registeredSchema).toBeDefined();
    expect(registeredSchema?.schemas.headers).toBeDefined();
    expect(registeredSchema?.location).toBe("test-file.ts:10");
  });

  it("应该为 form target 收集 body schema", () => {
    const formSchema = z.object({
      username: z.string(),
      password: z.string(),
    });

    zodValidator("form", formSchema);

    const registeredSchema = schemaRegistry.get("test-file.ts:10");
    expect(registeredSchema).toBeDefined();
    expect(registeredSchema?.schemas.body).toBeDefined();
    expect(registeredSchema?.location).toBe("test-file.ts:10");
  });
});
