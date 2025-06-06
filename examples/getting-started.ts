import { generateDocument, generateSwaggerUI, getSwaggerUIAssetInfo } from "api-morph";
import express from "express";

const app = express();

app.use(express.json());
app.use(express.static(getSwaggerUIAssetInfo().assetPath));

/**
 * @operation post /login 用户登录
 * @tags 用户管理
 * @operationId login
 * @okResponse {@link LoginVo} 用户登录成功
 * @requestBody {@link LoginDto} 登录数据
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
  const openapi = await generateDocument({
    info: {
      version: "1.0.0",
      title: "API Documentaion",
      description: "This is a simple API documentation",
    },
  });
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
