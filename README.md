<div align="center">
  <a href="https://yingzhi0808.github.io/api-morph/"><img src="https://yingzhi0808.github.io/api-morph/logo.svg" alt="api-morph logo" width="150" height="150"></a>
  <h1>api-morph</h1>
</div>

<div align="center">

[![ci](https://github.com/yingzhi0808/api-morph/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/yingzhi0808/api-morph/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/api-morph.svg)](https://www.npmjs.com/package/api-morph)
[![npm downloads](https://img.shields.io/npm/dm/api-morph.svg)](https://www.npmjs.com/package/api-morph)
[![license](https://img.shields.io/npm/l/api-morph.svg)](https://github.com/yingzhi0808/api-morph/blob/main/LICENSE)
[![codecov](https://codecov.io/gh/yingzhi0808/api-morph/graph/badge.svg?token=AK6BS4DRO1)](https://codecov.io/gh/yingzhi0808/api-morph)
</div>

一个现代化的 TypeScript 优先的 OpenAPI 文档生成器，通过分析代码和 JSDoc 注释自动生成全面、准确的 API 文档。

## ✨ 核心特性

- 📝 **JSDoc 驱动** - 使用熟悉的 JSDoc 语法描述 API，自动转换为 OpenAPI 3.1 文档
- 🤖 **智能分析** - 基于代码静态分析，自动推断 HTTP 方法、路径、参数等信息
- 🎯 **零侵入式** - 无需修改现有代码结构或添加装饰器，与现有项目完美融合
- 🛡️ **Zod 支持** - 原生支持 Zod Schema，享受类型安全的同时自动生成 JSON Schema
- 🔌 **多框架** - 支持 Express、Fastify、Koa 等主流 Node.js 框架
- ⚙️ **可扩展** - 插件化架构支持自定义标签解析器和配置选项

## 🚀 快速开始

### 安装

```bash
npm install api-morph
# 或者
pnpm add api-morph
# 或者
yarn add api-morph
```

### 基本使用

#### 1. 定义 Zod Schema

```typescript
// schema.ts
import { z } from "zod/v4";

export const UserIdDto = z.object({
  id: z.string().meta({ description: "用户ID" }),
});

export const UpdateUserDto = z.object({
  email: z.email().meta({
    description: "用户邮箱地址",
    examples: ["john.doe@example.com"],
  }),
  username: z.string().min(3).max(50).meta({
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
  username: z.string().min(3).max(50).meta({
    description: "用户名",
    examples: ["John Doe"],
  }),
});
```

#### 2. 创建 Express 应用

```typescript
// index.ts
import {
  generateDocument,
  generateSwaggerUI,
  getSwaggerUIAssetInfo,
  validateRequest,
} from "api-morph";
import express from "express";
import { UpdateUserDto, UpdateUserVo, UserIdDto } from "./schema";

const app = express();
app.use(express.json());

// 提供 Swagger UI 静态资源
app.use(express.static(getSwaggerUIAssetInfo().assetPath));

/**
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @tags users
 * @response 200 {@link UpdateUserVo} 更新用户信息成功
 */
app.put(
  "/api/users/:id",
  validateRequest({ params: UserIdDto, body: UpdateUserDto }),
  (req, res) => {
    const { id } = req.params;
    const { email, username } = req.body;

    res.json({ id, email, username });
  }
);

// 生成 OpenAPI 文档
const openapi = await generateDocument({
  info: {
    version: "1.0.0",
    title: "用户管理 API",
    description: "这是一个用户管理 API 的文档示例",
  },
});

// 提供 OpenAPI JSON 和 Swagger UI
app.get("/openapi.json", (req, res) => res.json(openapi));
app.get("/swagger-ui", (req, res) => {
  res.send(generateSwaggerUI({ url: "/openapi.json" }));
});

app.listen(3000, () => {
  console.log("访问 http://localhost:3000/swagger-ui 查看 API 文档");
});
```

## 📖 文档

完整的文档和 API 参考请访问我们的[官方文档站点](https://api-morph.example.com)。

- [快速开始指南](https://api-morph.example.com/guides/getting-started) - 详细的入门教程
- [语法概览](https://api-morph.example.com/guides/syntax-overview) - JSDoc 标签语法说明
- [工作原理](https://api-morph.example.com/guides/working-principles) - 了解 api-morph 的工作机制
- [API 参考](https://api-morph.example.com/api/) - 完整的 API 文档

## 🔧 支持的框架

- ✅ Express
- ✅ Fastify（即将支持）
- ✅ Koa（即将支持）
- ✅ NestJS（即将支持）

## 📄 许可证

本项目基于 [MIT](_media/LICENSE) 许可证开源。
