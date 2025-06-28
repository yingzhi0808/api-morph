import Koa from "koa";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { GenerateSwaggerUIHTMLOptions } from "@/core/swagger";
import { setupSwaggerUI } from "./swagger";

describe("setupSwaggerUI", () => {
  it("应该使用默认选项设置Swagger", async () => {
    const app = new Koa();
    const path = "/api-docs";

    setupSwaggerUI(path, app);

    const response = await request(app.callback())
      .get(path)
      .expect(200)
      .expect("Content-Type", /text\/html/);

    expect(response.text).toMatchSnapshot();
  });

  it("应该使用自定义选项设置Swagger", async () => {
    const app = new Koa();
    const path = "/docs";
    const options: GenerateSwaggerUIHTMLOptions = {
      url: "/api/openapi.json",
      title: "My API Documentation",
      customCss: "body { color: red; }",
      customJs: "console.log('test');",
      persistAuthorization: true,
    };

    setupSwaggerUI(path, app, options);

    const response = await request(app.callback())
      .get(path)
      .expect(200)
      .expect("Content-Type", /text\/html/);

    expect(response.text).toMatchSnapshot();
  });

  it("应该处理空对象选项", async () => {
    const app = new Koa();
    const path = "/docs";
    const options = {};

    setupSwaggerUI(path, app, options);

    const response = await request(app.callback())
      .get(path)
      .expect(200)
      .expect("Content-Type", /text\/html/);

    expect(response.text).toMatchSnapshot();
  });

  it("应该在不同路径下正确工作", async () => {
    const app = new Koa();

    // 设置多个不同的 Swagger UI 路径
    setupSwaggerUI("/api-docs", app, { title: "API Docs" });
    setupSwaggerUI("/swagger", app, { title: "Swagger" });

    // 测试第一个路径
    const response1 = await request(app.callback()).get("/api-docs").expect(200);
    expect(response1.text).toContain("API Docs");

    // 测试第二个路径
    const response2 = await request(app.callback()).get("/swagger").expect(200);
    expect(response2.text).toContain("Swagger");
  });
});
