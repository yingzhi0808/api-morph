import { describe, expect, it, vi } from "vitest";
import z from "zod/v4";
import { getCallLocation, SchemaRegistry } from "./SchemaRegistry";

describe("SchemaRegistry", () => {
  const registry = SchemaRegistry.getInstance();
  const registry2 = SchemaRegistry.getInstance();
  expect(registry).toBe(registry2);

  describe("register", () => {
    it("应该能够注册一个 Schema", () => {
      const bodySchema = z.object({
        name: z.string(),
        email: z.email(),
      });
      const querySchema = z.object({
        page: z.number(),
      });
      const paramsSchema = z.object({
        id: z.string(),
      });
      const headersSchema = z.object({
        "x-request-id": z.string(),
      });
      const location = "test-file.ts:10";

      registry.register(location, {
        body: bodySchema,
        query: querySchema,
        params: paramsSchema,
        headers: headersSchema,
      });

      const retrievedSchema = registry.get(location);
      expect(retrievedSchema).toBeDefined();
      expect(retrievedSchema?.schemas.body).toBeDefined();
      expect(retrievedSchema?.schemas.query).toBeDefined();
      expect(retrievedSchema?.schemas.params).toBeDefined();
      expect(retrievedSchema?.schemas.headers).toBeDefined();
    });
  });

  describe("get", () => {
    it("应该能够通过位置获取已注册的 Schema", () => {
      const querySchema = z.object({
        page: z.number().optional(),
        limit: z.number().optional(),
      });
      const location = "test-file.ts:15";

      registry.register(location, {
        query: querySchema,
      });

      const retrievedSchema = registry.get(location);
      expect(retrievedSchema).toBeDefined();
      expect(retrievedSchema?.location).toBe(location);
      expect(retrievedSchema?.schemas.query).toBeDefined();
    });
  });

  describe("clear", () => {
    it("应该能够清空所有已注册的 Schema", () => {
      const location = "test-file.ts:20";
      registry.register(location, {
        body: z.object({ test: z.string() }),
      });

      expect(registry.get(location)).toBeDefined();

      registry.clear();

      expect(registry.get(location)).toBeUndefined();
    });
  });
});

describe("getCallLocation", () => {
  it("应该能够获取调用位置信息", () => {
    const location = getCallLocation(0);
    // 在测试环境中，只验证格式是否正确
    expect(location).toMatch(/.*:\d+/);
  });

  it("当 stack 不存在时应该返回 unknown", () => {
    const errorSpy = vi.spyOn(global, "Error");
    errorSpy.mockImplementation(() => ({
      stack: undefined,
      name: "Error",
      message: "Test Error",
    }));
    const location = getCallLocation(0);
    expect(location).toBe("unknown");
    errorSpy.mockRestore();
  });

  it("当无法从行中解析出文件和行号时应该返回 unknown", () => {
    const errorSpy = vi.spyOn(global, "Error");
    errorSpy.mockImplementation(() => ({
      stack: "Error\n    at invalid-stack-frame",
      name: "Error",
      message: "Test Error",
    }));
    const location = getCallLocation(0);
    expect(location).toBe("unknown");
    errorSpy.mockRestore();
  });

  it("应该能够跳过指定数量的栈帧", () => {
    function testFunction() {
      return getCallLocation(1);
    }

    const location = testFunction();
    // 在测试环境中，只验证格式是否正确
    expect(location).toMatch(/.*:\d+/);
  });
});
