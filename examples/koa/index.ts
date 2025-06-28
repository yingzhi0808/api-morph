import Router from "@koa/router";
import { generateDocument } from "api-morph";
import { setupSwaggerUI, zodValidator } from "api-morph/koa";
import Koa from "koa";
import { UpdateUserDto, UpdateUserVo, UserIdDto } from "./schema";

const app = new Koa();
const router = new Router();

/**
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @tags users
 * @response 200 {@link UpdateUserVo} 更新用户信息成功
 */
router.put(
  "/api/users/:id",
  zodValidator({
    params: UserIdDto,
    body: UpdateUserDto,
  }),
  (ctx) => {
    const { id } = ctx.params;
    const { email, username } = ctx.request.body;

    ctx.body = {
      id,
      email,
      username,
    };
  },
);

app.use(router.routes()).use(router.allowedMethods());

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
      include: ["examples/koa/**/*.ts"],
    },
  },
);

// 提供 OpenAPI JSON 文档
router.get("/openapi.json", (ctx) => {
  ctx.body = openapi;
});

// 提供 Swagger UI 界面
setupSwaggerUI("/swagger-ui", app);

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  console.log(`访问 http://localhost:${port}/swagger-ui 查看 API 文档`);
});
