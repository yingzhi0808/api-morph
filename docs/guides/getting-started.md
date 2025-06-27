# 快速开始

欢迎使用 api-morph！本指南将通过一个完整的示例，带您逐步体验 api-morph 的强大功能。

## 前置准备工作

在开始之前，我们需要创建一个新的项目并配置好基本的开发环境。

### 1. 创建 package.json

首先创建项目目录并初始化 package.json：

```bash
mkdir my-api-project
cd my-api-project
```

创建 `package.json` 文件：

```json
{
  "name": "my-api-project",
  "type": "module",
  "scripts": {
    "dev": "tsx watch index.ts"
  }
}
```

### 2. 创建 tsconfig.json

创建 TypeScript 配置文件 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext"],
    "moduleDetection": "force",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts"]
}
```

### 3. 安装依赖

安装核心依赖：

::: code-group

```bash [pnpm]
pnpm add api-morph express zod
```

```bash [npm]
npm install api-morph express zod
```

```bash [yarn]
yarn add api-morph express zod
```

:::

安装开发依赖：

::: code-group

```bash [pnpm]
pnpm add -D @types/express @types/node typescript tsx
```

```bash [npm]
npm install -D @types/express @types/node typescript tsx
```

```bash [yarn]
yarn add -D @types/express @types/node typescript tsx
```

:::

## 第一步：搭建基本的 Express 应用

让我们先创建一个基本的 Express 应用框架。

创建 `index.ts` 文件：

```typescript
import express from "express";

const app = express();

app.use(express.json());

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

## 第二步：定义 Zod Schema

接下来，我们创建必要的 Zod schema 来定义数据结构。创建 `schema.ts` 文件：

```typescript
import { z } from "zod/v4";

export const UserIdDto = z.object({
  id: z.string().meta({ description: "用户ID" }),
});

export const UpdateUserDto = z.object({
  email: z.email().meta({
    description: "用户邮箱地址",
    examples: ["john.doe@example.com"],
  }),
  username: z
    .string()
    .min(3)
    .max(50)
    .meta({
      description: "用户名",
      examples: ["John Doe"],
    }),
});

export const UpdateUserVo = z.object({
  id: z.string().meta({ description: "用户ID" }),
  email: z.email().meta({
    description: "用户邮箱地址",
    examples: ["john.doe@example.com"],
  }),
  username: z
    .string()
    .min(3)
    .max(50)
    .meta({
      description: "用户名",
      examples: ["John Doe"],
    }),
});
```

这些 schema 定义了：
- `UserIdDto`：用于验证路径参数中的用户ID
- `UpdateUserDto`：用于验证更新用户的请求体数据
- `UpdateUserVo`：定义更新用户的响应数据结构

::: tip
api-morph 仅支持 Zod v4 版本，因为只有 Zod v4 才支持生成 JSON Schema。请确保从 `zod/v4` 导入，而不是直接从 `zod` 导入。
:::

## 第三步：定义 Express 路由

现在让我们在 `index.ts` 中添加一个获取用户信息的 API 路由：

```typescript
import express from "express";

const app = express();

app.use(express.json());

// [!code ++:10]
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { email, username } = req.body;

  res.json({
    id,
    email,
    username,
  });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

## 第四步：定义基本路由信息

现在我们为路由添加 JSDoc 注释，包含 summary、description 和 tags：

```typescript
import express from "express";

const app = express();

app.use(express.json());

// [!code ++:5]
/**
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @tags users
 */
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { email, username } = req.body;

  res.json({
    id,
    email,
    username,
  });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

JSDoc 注释说明：
- `@summary`：API 的简短描述
- `@description`：API 的详细描述
- `@tags`：API 分组标签，用于在文档中分类

## 第五步：通过中间件定义请求参数

现在我们引入 api-morph 的验证中间件来处理请求参数：

```typescript
import express from "express";
// [!code ++:2]
import { zodValidator } from "api-morph/express";
import { UpdateUserDto, UserIdDto } from "./schema";

const app = express();

app.use(express.json());

/**
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @tags users
 */
app.put("/api/users/:id", (req, res) => { // [!code --]
// [!code ++:4]
app.put(
  "/api/users/:id",
  zodValidator({ params: UserIdDto, body: UpdateUserDto }),
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

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

### 这一步发生了什么？

通过集成 `zodValidator` 中间件，我们可以利用 Zod 对请求参数进行校验，这在真实的后端项目中几乎是必须的步骤。如果你不使用 api-morph，也会通过其他的方式实现这个功能。

**api-morph 的核心理念是尽可能利用已有的代码，分析它，然后自动推断出必要的信息。** 当你使用 `zodValidator` 后，api-morph 会分析它然后自动生成对应的请求参数文档。

具体来说：
- **自动验证路径参数**：`params: UserIdDto` 会验证 URL 中的 `:id` 参数
- **自动验证请求体**：`body: UpdateUserDto` 会验证 POST/PUT 请求的 JSON 数据
- **自动生成文档**：api-morph 会读取这些 Zod schema，并在 OpenAPI 文档中生成对应的参数说明
- **错误处理**：如果验证失败，中间件会自动返回 400 错误响应

这样，你的业务代码既有了类型安全保障，又自动生成了准确的 API 文档，一举两得！

## 第六步：定义响应

现在我们在 JSDoc 注释中添加响应定义：

```typescript
import express from "express";
import { zodValidator } from "api-morph/express";
import { UpdateUserDto, UserIdDto } from "./schema"; // [!code --]
import { UpdateUserDto, UpdateUserVo, UserIdDto } from "./schema"; // [!code ++]

const app = express();

app.use(express.json());

/**
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @tags users
// [!code ++:1]
 * @response 200 {@link UpdateUserVo} 更新用户信息成功
 */
app.put(
  "/api/users/:id",
  zodValidator({ params: UserIdDto, body: UpdateUserDto }),
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

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

`@response` 注释说明：
- `200`：HTTP 状态码
- `{@link UpdateUserVo}`：引用我们定义的响应 schema
- `更新用户信息成功`：响应描述

::: tip
`{@link}` 是合法的 JSDoc 语法，用于创建对其他类型或变量的引用。api-morph 会解析这些链接并自动找到对应的 Zod schema 定义，然后在 OpenAPI 文档中生成完整的类型信息。
:::

## 第七步：生成 OpenAPI 并在 Express 中提供服务

最后，我们添加生成和提供 OpenAPI 文档的功能：

```typescript
import express from "express";
import { zodValidator } from "api-morph/express"; // [!code --]
import { generateDocument } from "api-morph"; // [!code ++]
import { setupSwaggerUI, zodValidator } from "api-morph/express"; // [!code ++]
import { UpdateUserDto, UpdateUserVo, UserIdDto } from "./schema";

const app = express();

app.use(express.json());

/**
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @tags users
 * @response 200 {@link UpdateUserVo} 更新用户信息成功
 */
app.put(
  "/api/users/:id",
  zodValidator({ params: UserIdDto, body: UpdateUserDto }),
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

// [!code ++:18]
// 生成 OpenAPI 文档
const openapi = await generateDocument(
  {
    info: {
      version: "1.0.0",
      title: "用户管理 API",
      description: "这是一个用户管理 API 的文档示例",
    },
  },
);

// 提供 OpenAPI JSON 文档
app.get("/openapi.json", (req, res) => {
  res.json(openapi);
});

// 提供 Swagger UI 界面
setupSwaggerUI("/swagger-ui", app);

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  console.log(`访问 http://localhost:${port}/swagger-ui 查看 API 文档`);
});
```

## 运行和测试

现在启动应用：

```bash
npm run dev
```

你可以：

1. **测试 API**：使用 curl 或 Postman 测试 `PUT /api/users/:id` 接口
2. **查看文档**：访问 `http://localhost:3000/swagger-ui` 查看生成的 API 文档
3. **获取 OpenAPI JSON**：访问 `http://localhost:3000/openapi.json` 获取原始的 OpenAPI 规范

## 完整的文件结构

最终你的项目结构应该是这样的：

```
your-project/
├── index.ts          # 主应用文件
├── schema.ts         # Zod schema 定义
├── package.json      # 项目配置
└── tsconfig.json     # TypeScript 配置
```

## 下一步

现在你已经掌握了 api-morph 的基本用法！你可以：

1. 添加更多的路由和 schema
2. 探索更多的 JSDoc 标签功能
3. 自定义 OpenAPI 文档的样式和配置
4. 集成到现有的 Express 项目中

查看我们的其他指南了解更多高级功能！
