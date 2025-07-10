import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { GenerateSwaggerUIHTMLOptions } from "@/core/swagger";
import { setupSwaggerUI } from "./swagger";

describe("setupSwaggerUI", () => {
  it("应该使用默认选项设置Swagger", async () => {
    const app = new Hono();
    const path = "/api-docs";

    setupSwaggerUI(path, app);

    const response = await app.request(path);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/text\/html/);

    const html = await response.text();
    expect(html).toMatchSnapshot();
  });

  it("应该使用自定义选项设置Swagger", async () => {
    const app = new Hono();
    const path = "/docs";
    const options: GenerateSwaggerUIHTMLOptions = {
      url: "/api/openapi.json",
      title: "My API Documentation",
      customCss: "body { color: red; }",
      customJs: "console.log('test');",
      persistAuthorization: true,
    };

    setupSwaggerUI(path, app, options);

    const response = await app.request(path);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/text\/html/);

    const html = await response.text();
    expect(html).toMatchSnapshot();
  });

  it("应该处理空对象选项", async () => {
    const app = new Hono();
    const path = "/docs";
    const options = {};

    setupSwaggerUI(path, app, options);

    const response = await app.request(path);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/text\/html/);

    const html = await response.text();
    expect(html).toMatchSnapshot();
  });

  it("应该在不同路径下正确工作", async () => {
    const app = new Hono();

    // 设置多个不同的 Swagger UI 路径
    setupSwaggerUI("/api-docs", app, { title: "API Docs" });
    setupSwaggerUI("/swagger", app, { title: "Swagger" });

    // 测试第一个路径
    const response1 = await app.request("/api-docs");
    expect(response1.status).toBe(200);
    const html1 = await response1.text();
    expect(html1).toContain("API Docs");

    // 测试第二个路径
    const response2 = await app.request("/swagger");
    expect(response2.status).toBe(200);
    const html2 = await response2.text();
    expect(html2).toContain("Swagger");
  });
});
