import { generateDocument } from "api-morph";
import { setupSwaggerUI, zodValidator } from "api-morph/express";
import express from "express";
import { UpdateUserDto, UpdateUserVo, UserIdDto } from "./schema";

const app = express();

app.use(express.json());

const usersRouter = express.Router();
const versionRouter = express.Router();

/**
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @tags users
 * @response 200 {@link UpdateUserVo} 更新用户信息成功
 */
usersRouter.put(
  ":id",
  zodValidator({
    params: UserIdDto,
    body: UpdateUserDto,
  }),
  (req, res) => {
    const { id } = req.params;
    const { email, username } = req.body;

    res.json({
      id,
      email,
      username,
    });
  },
);

versionRouter.use("users", usersRouter);
app.use(versionRouter);

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
      include: ["examples/express/**/*.ts"],
    },
  },
);

console.log(openapi);

// 提供 OpenAPI JSON 文档
app.get("/openapi.json", (_req, res) => {
  res.json(openapi);
});

// 提供 Swagger UI 界面
setupSwaggerUI("/swagger-ui", app);

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  console.log(`访问 http://localhost:${port}/swagger-ui 查看 API 文档`);
});
