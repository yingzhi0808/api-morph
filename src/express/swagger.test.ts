import { afterEach } from "node:test";
import type { Express, Request, Response } from "express";
import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerateSwaggerUIHTMLOptions } from "@/core/swagger";
import { setupSwaggerUI } from "./swagger";

vi.mock("express", () => ({
  default: {
    static: vi.fn(),
  },
}));

vi.mock("@/core/swagger", () => ({
  getSwaggerUIAssetDir: vi.fn(() => "/path/to/swagger-ui-dist"),
  generateSwaggerUIHTML: vi.fn((options = {}) => {
    const {
      url = "/openapi.json",
      title = "Swagger UI",
      customCss = "",
      customJs = "",
      persistAuthorization = false,
    } = options;
    return `<html><head><title>${title}</title></head><body><div id="swagger-ui"></div><script>url: "${url}", persistAuthorization: ${persistAuthorization}</script>${customCss}${customJs}</body></html>`;
  }),
}));

describe("setupSwaggerUI", () => {
  let mockApp: Express;
  let mockUse: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUse = vi.fn();
    mockGet = vi.fn();

    mockApp = {
      use: mockUse,
      get: mockGet,
    } as unknown as Express;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("应该使用默认选项设置Swagger", () => {
    const path = "/api-docs";

    setupSwaggerUI(path, mockApp);

    expect(express.static).toHaveBeenCalledWith("/path/to/swagger-ui-dist");
    expect(mockUse).toHaveBeenCalledWith(express.static("/path/to/swagger-ui-dist"));
    expect(mockGet).toHaveBeenCalledWith(path, expect.any(Function));
  });

  it("应该使用自定义选项设置Swagger", () => {
    const path = "/docs";
    const options: GenerateSwaggerUIHTMLOptions = {
      url: "/api/openapi.json",
      title: "My API Documentation",
      customCss: "body { color: red; }",
      customJs: "console.log('test');",
      persistAuthorization: true,
    };

    setupSwaggerUI(path, mockApp, options);

    expect(express.static).toHaveBeenCalledWith("/path/to/swagger-ui-dist");
    expect(mockUse).toHaveBeenCalledWith(express.static("/path/to/swagger-ui-dist"));
    expect(mockGet).toHaveBeenCalledWith(path, expect.any(Function));
  });

  it("应该正确处理GET请求并返回HTML", async () => {
    const path = "/swagger";
    const options: GenerateSwaggerUIHTMLOptions = {
      title: "Test API",
      url: "/test-openapi.json",
    };

    setupSwaggerUI(path, mockApp, options);

    const routeHandler = mockGet.mock.calls[0][1];

    const mockReq = {} as Request;
    const mockRes = {
      setHeader: vi.fn(),
      send: vi.fn(),
    } as unknown as Response;

    await routeHandler(mockReq, mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
    expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining("<html>"));
    expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining("Test API"));
    expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining("/test-openapi.json"));
  });

  it("应该在没有选项时使用默认选项处理GET请求", async () => {
    const path = "/api-docs";

    setupSwaggerUI(path, mockApp);

    const routeHandler = mockGet.mock.calls[0][1];

    const mockReq = {} as Request;
    const mockRes = {
      setHeader: vi.fn(),
      send: vi.fn(),
    } as unknown as Response;

    await routeHandler(mockReq, mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
    expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining("Swagger UI"));
    expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining("/openapi.json"));
  });

  it("应该处理空对象选项", async () => {
    const path = "/docs";
    const options = {};

    setupSwaggerUI(path, mockApp, options);

    expect(mockUse).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledTimes(1);

    const routeHandler = mockGet.mock.calls[0][1];
    const mockReq = {} as Request;
    const mockRes = {
      setHeader: vi.fn(),
      send: vi.fn(),
    } as unknown as Response;

    await routeHandler(mockReq, mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
    expect(mockRes.send).toHaveBeenCalledWith(expect.any(String));
  });
});
