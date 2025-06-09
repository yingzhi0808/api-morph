import { generateDocument, generateSwaggerUI, getSwaggerUIAssetInfo } from "api-morph";
import express from "express";

const app = express();

app.use(express.json());
app.use(express.static(getSwaggerUIAssetInfo().assetPath));

/**
 * @operation post /login1
 * @summary 用户登录接口
 * @description 提供用户登录功能，校验用户名和密码，登录成功后返回用户ID和认证令牌
 * @tags 认证与授权
 * @operationId login
 * @requestBody
 * description: 用户登录所需的用户名和密码
 * required: true
 * content:
 *   application/json:
 *     schema:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           description: 用户的唯一登录名
 *           examples: [admin]
 *         password:
 *           type: string
 *           description: 用户的登录密码
 *           examples: [123456]
 *         required:
 *          - username
 *          - password
 * @response 200 登录成功，返回用户信息和认证令牌
 * content:
 *   application/json:
 *     schema:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 用户唯一标识
 *           examples: [1]
 *         token:
 *           type: string
 *           description: 用户认证令牌，用于后续接口鉴权
 *           examples: [token-123456]
 * @response 401 登录失败，返回错误信息
 * content:
 *   application/json:
 *     schema:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: 错误信息
 *           examples: [Invalid username or password]
 */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== "admin" || password !== "123456") {
    res.status(401).json({ message: "Invalid username or password" });
  } else {
    res.json({ id: 1, token: "token-123456" });
  }
});

const openapi = await generateDocument(
  {
    info: {
      version: "1.0.0",
      title: "API Documentaion",
      description: "This is a simple API documentation",
    },
  },
  {
    parserOptions: {
      include: ["examples/getting-started/*.ts"],
    },
  },
);

console.log(JSON.stringify(openapi, null, 2));

app.get("/openapi.json", async (_req, res) => {
  res.json(openapi);
});

app.get("/swagger-ui", (_req, res) => {
  res.send(
    generateSwaggerUI({
      url: "/openapi.json",
    }),
  );
});

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
