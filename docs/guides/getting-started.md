# 快速开始

## 前置要求

在开始使用 api-morph 之前，你需要有一个 TypeScript 和 Node.js 的后端项目，你可以使用 express、fastify 和 koa 等框架。在这个教程中，我们将使用 express 框架。

## 项目初始化

### 1. 创建项目目录和基础文件

首先创建一个新的项目目录：

```bash
mkdir my-api-project
cd my-api-project
```

### 2. 初始化 package.json

创建 `package.json` 文件，配置项目的基本信息和依赖：

```json
{
  "type": "module",
  "scripts": {
    "start": "tsx watch src/index.ts"
  },
  "dependencies": {
    "express": "^5.1.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.2",
    "tsx": "^4.19.4"
  }
}
```

### 3. 配置 TypeScript

创建 `tsconfig.json` 文件来配置 TypeScript 编译选项：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true
  },
  "include": ["src"]
}
```

### 4. 安装基础依赖

使用你选择的包管理器安装项目依赖：

::: code-group

```bash [pnpm]
pnpm install
```

```bash [npm]
npm install
```

```bash [yarn]
yarn install
```

:::

### 5. 安装 api-morph

现在安装 api-morph 来生成 API 文档：

::: code-group

```bash [pnpm]
pnpm add api-morph
```

```bash [npm]
npm install api-morph
```

```bash [yarn]
yarn add api-morph
```

:::

## 创建 Express 应用

### 1. 创建基础服务器结构

在 `src/index.ts` 文件中创建基础的 Express 应用，并直接添加登录接口：

```typescript
import express from "express";

const app = express();

// 配置中间件
app.use(express.json());

// 登录接口
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== "admin" || password !== "123456") {
    res.status(401).json({ message: "Invalid username or password" });
  } else {
    res.json({ id: 1, token: "token-123456" });
  }
});

// 启动服务器
const port = 3000;
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
```

现在你可以运行 `npm start` 来启动开发服务器。

## 使用 JSDoc 注释生成 API 文档

api-morph 通过解析 JSDoc 注释来生成 OpenAPI 文档。让我们为登录接口添加详细的文档注释。

### 1. 添加基础元数据

首先，我们为接口添加基本的元数据信息：

```typescript
/**
 * @operation post /login 用户登录接口
 * @description 提供用户登录功能，校验用户名和密码，登录成功后返回用户ID和认证令牌
 * @tags 认证与授权
 * @operationId login
 */
app.post("/login", (req, res) => {
  // ... 路由处理逻辑
});
```

让我们解释一下这些 JSDoc 标签的含义：

- `@operation`: 定义 HTTP 方法、路径和接口名称
  - 格式：`@operation {method} {path} {summary}`
  - 示例：`@operation post /login 用户登录接口`

- `@description`: 接口的详细描述，解释接口的功能和用途

- `@tags`: 为接口分组，便于在文档中组织和查找
  - 可以使用中文标签名，如 "认证与授权"、"用户管理" 等

- `@operationId`: 接口的唯一标识符，通常用于代码生成工具

### 2. 定义请求体

接下来，我们定义接口的请求体结构：

```typescript
/**
 * @operation post /login 用户登录接口
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
 */
```

`@requestBody` 标签用于定义请求体的结构：
- `description`: 请求体的描述
- `required`: 是否必需（true/false）
- `content`: 定义不同媒体类型的内容结构
- `schema`: 定义数据结构，包括类型、属性、示例值等

### 3. 定义响应

最后，我们定义接口可能的响应：

```typescript
/**
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
```

`@response` 标签用于定义不同状态码的响应：
- 格式：`@response {statusCode} {description}`
- 每个响应可以定义不同的内容类型和数据结构

## 配置 Swagger UI

### 1. 导入 api-morph 功能

首先，在文件顶部导入 api-morph 的相关功能：

```typescript
import { generateDocument, generateSwaggerUI, getSwaggerUIAssetInfo } from "api-morph";
import express from "express";
```

### 2. 配置静态资源服务

为了让 Swagger UI 正常工作，我们需要配置静态资源服务：

```typescript
const app = express();

app.use(express.json());
// 配置 Swagger UI 静态资源目录
app.use(express.static(getSwaggerUIAssetInfo().assetPath));
```

`getSwaggerUIAssetInfo().assetPath` 返回 Swagger UI 所需的静态资源路径。

### 3. 添加 OpenAPI 文档接口

创建一个接口来生成和返回 OpenAPI 文档：

```typescript
app.get("/openapi.json", async (req, res) => {
  const openapi = await generateDocument(
    {
      info: {
        version: "1.0.0",
        title: "API Documentation",
        description: "这是一个简单的 API 文档示例",
      },
    },
  );
  res.json(openapi);
});
```

`generateDocument` 函数的参数说明：
- 第一个参数：OpenAPI 文档的基本信息
- 第二个参数：解析选项，`include` 指定要解析的文件路径模式

### 4. 添加 Swagger UI 界面

创建一个路由来展示 Swagger UI 界面：

```typescript
app.get("/swagger-ui", (_req, res) => {
  res.send(
    generateSwaggerUI({
      url: "/openapi.json",
    }),
  );
});
```

`generateSwaggerUI` 函数生成 Swagger UI 的 HTML 页面，`url` 参数指向 OpenAPI 文档的接口地址。

## 测试你的 API 文档

现在启动服务器：

```bash
npm start
```

然后在浏览器中访问：

- API 文档界面：http://localhost:3000/swagger-ui
- OpenAPI JSON：http://localhost:3000/openapi.json

你应该能看到一个完整的 API 文档界面，包含你刚才定义的登录接口及其详细的参数和响应说明。
