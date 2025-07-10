import { serve } from "@hono/node-server";
import { generateDocument } from "api-morph";
import { setupSwaggerUI, zodValidator } from "api-morph/hono";
import { Hono } from "hono";
import { UpdateUserDto, UpdateUserVo, UserIdDto } from "./schema";

const app = new Hono();

/**
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @tags users
 * @response 200 {@link UpdateUserVo} 更新用户信息成功
 */
app.put(
  "/api/users/:id",
  zodValidator("param", UserIdDto),
  zodValidator("json", UpdateUserDto),
  (c) => {
    const { id } = c.req.valid("param");
    const { email, username } = c.req.valid("json");

    return c.json({
      id,
      email,
      username,
    });
  },
);

// 生成 OpenAPI 文档
const openapi = await generateDocument(
  {
    info: {
      version: "1.0.0",
      title: "用户管理 API",
      description: "这是一个用户管理 API 的文档示例",
    },
  },
  {
    parserOptions: {
      include: ["examples/hono/**/*.ts"],
    },
  },
);

// 提供 OpenAPI JSON 文档
app.get("/openapi.json", (c) => {
  return c.json(openapi);
});

// 提供 Swagger UI 界面
setupSwaggerUI("/swagger-ui", app);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Example app listening on port ${info.port}`);
    console.log(`访问 http://localhost:${info.port}/swagger-ui 查看 API 文档`);
  },
);
