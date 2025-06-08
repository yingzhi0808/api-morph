import { generateDocument, generateSwaggerUI, getSwaggerUIAssetInfo } from "api-morph";
import express from "express";
import { LoginDto, LoginErrorVo, LoginSuccessVo } from "./schema";

const app = express();

app.use(express.json());
app.use(express.static(getSwaggerUIAssetInfo().assetPath));

/**
 * @operation post /login 用户登录接口
 * @description 提供用户登录功能，校验用户名和密码，登录成功后返回用户ID和认证令牌
 * @tags 认证与授权
 * @operationId login
 * @requestBody {@link LoginDto} 用户登录所需的用户名和密码
 * @okResponse {@link LoginSuccessVo} 登录成功，返回用户信息和认证令牌
 * @unauthorizedResponse {@link LoginErrorVo}  登录失败，返回错误信息
 */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== "admin" || password !== "123456") {
    res.status(401).json({ message: "Invalid username or password" });
  } else {
    res.json({ id: 1, token: "token-123456" });
  }
});

app.get("/openapi.json", async (_req, res) => {
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
        include: ["src/**/*.ts"],
      },
    },
  );
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
