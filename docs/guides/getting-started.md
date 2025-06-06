# 快速开始

## 前置要求

在开始使用 api-morph 之前，你需要有一个 TypeScript 和 Node.js 的后端项目，你可以使用 express、fastify 和 koa 等框架。在这个教程中，我们将使用 express 框架。

## 安装

使用你喜欢的包管理器安装 api-morph：

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

## 基础用法

### 1. 在代码中添加 JSDoc 注释

在你的 TypeScript 文件中添加 JSDoc 注释来描述 API：

```typescript
// user.ts
import { z } from 'zod';

// 使用 Zod 定义 schema（可选，推荐）
const UserSchema = z.object({
  id: z.string().describe('用户唯一标识'),
  name: z.string().min(2, '姓名至少2个字符').describe('用户姓名'),
  email: z.string().email('邮箱格式不正确').describe('用户邮箱'),
  createdAt: z.date().describe('创建时间')
});

const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });

/**
 * @operation GET /users/{id}
 * @summary 获取用户信息
 * @description 根据用户ID获取用户的详细信息，支持智能类型推断
 * @parameter id path string true 用户ID
 * @response 200 获取成功
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/User"
 * @response 404 用户不存在
 */
export function getUser(id: string): Promise<z.infer<typeof UserSchema>> {
  // API Morph 会自动分析函数签名和返回类型
  // 无需修改现有代码逻辑
}

/**
 * @operation POST /users
 * @summary 创建用户
 * @requestBody 创建用户请求
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/CreateUser"
 * @response 201 创建成功
 * @response 400 请求参数错误
 */
export function createUser(userData: z.infer<typeof CreateUserSchema>): Promise<z.infer<typeof UserSchema>> {
  // 保持原有的开发习惯，无需装饰器或特殊结构
}
```

### 2. 生成 OpenAPI 文档

创建一个脚本来生成文档：

```typescript
// generate-docs.ts
import { generateDocument, DocumentBuilder } from 'api-morph';

async function main() {
  // 创建文档构建器
  const documentBuilder = new DocumentBuilder({
    info: {
      title: '用户管理 API',
      version: '1.0.0',
      description: '用户管理系统的 REST API'
    }
  });

  // 生成文档
  const document = await generateDocument(documentBuilder, {
    parserOptions: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts']
    }
  });

  console.log(JSON.stringify(document, null, 2));
}

main().catch(console.error);
```

### 3. 运行生成脚本

```bash
npx tsx generate-docs.ts
```

这将输出生成的 OpenAPI 文档 JSON。

## 集成 Swagger UI

API Morph 提供了内置的 Swagger UI 集成，让你可以快速创建美观的 API 文档界面：

```typescript
// server.ts
import express from 'express';
import { generateDocument, generateSwaggerUI, DocumentBuilder } from 'api-morph';

const app = express();

// 生成 OpenAPI 文档
const documentBuilder = new DocumentBuilder({
  info: {
    title: '用户管理 API',
    version: '1.0.0'
  }
});

const document = await generateDocument(documentBuilder, {
  parserOptions: {
    include: ['src/**/*.ts']
  }
});

// 提供 OpenAPI JSON
app.get('/openapi.json', (req, res) => {
  res.json(document);
});

// 集成 Swagger UI
const swaggerUI = generateSwaggerUI({
  url: '/openapi.json',
  title: '用户管理 API 文档'
});

app.get('/docs', (req, res) => {
  res.send(swaggerUI);
});

app.listen(3000, () => {
  console.log('服务器启动在 http://localhost:3000');
  console.log('API 文档在 http://localhost:3000/docs');
});
```

## 多框架适配示例

API Morph 支持多种 Node.js 框架，以下是不同框架的集成示例：

### Express 集成

```typescript
import express from 'express';
import { setupApiMorphDocs } from 'api-morph/express';

const app = express();

// 一键集成文档服务
setupApiMorphDocs(app, {
  documentBuilder: new DocumentBuilder({
    info: { title: 'Express API', version: '1.0.0' }
  }),
  paths: {
    docs: '/docs',
    openapi: '/openapi.json'
  }
});
```

### Fastify 集成

```typescript
import Fastify from 'fastify';
import { fastifyApiMorph } from 'api-morph/fastify';

const fastify = Fastify();

// 注册插件
await fastify.register(fastifyApiMorph, {
  documentBuilder: new DocumentBuilder({
    info: { title: 'Fastify API', version: '1.0.0' }
  })
});
```

### Koa 集成

```typescript
import Koa from 'koa';
import { koaApiMorph } from 'api-morph/koa';

const app = new Koa();

// 使用中间件
app.use(koaApiMorph({
  documentBuilder: new DocumentBuilder({
    info: { title: 'Koa API', version: '1.0.0' }
  })
}));
```

## 使用构建器 API

除了 JSDoc 注释，你还可以使用构建器 API 来编程式地构建文档：

```typescript
import { DocumentBuilder, OperationBuilder, ResponseBuilder } from 'api-morph';

// 创建文档构建器
const documentBuilder = new DocumentBuilder()
  .setTitle('用户管理 API')
  .setVersion('1.0.0')
  .setDescription('用户管理系统的 REST API');

// 创建操作构建器
const getUserOperation = new OperationBuilder()
  .setSummary('获取用户信息')
  .setDescription('根据用户ID获取用户的详细信息')
  .addTag('用户管理');

// 创建响应构建器
const successResponse = new ResponseBuilder()
  .setDescription('获取成功')
  .addContent('application/json', {
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' }
      }
    }
  });

// 组装文档
getUserOperation.addResponse('200', successResponse.build());

documentBuilder.addPathItem('/users/{id}', {
  get: getUserOperation.build()
});

const document = documentBuilder.build();
```

## 配置选项

你可以通过配置选项来自定义文档生成的行为：

```typescript
const document = await generateDocument(documentBuilder, {
  parserOptions: {
    // 包含的文件模式
    include: ['src/**/*.ts'],
    // 排除的文件模式
    exclude: ['src/**/*.test.ts', 'node_modules/**'],
    // 是否包含已废弃的 API
    includeDeprecated: false,
    // 默认响应媒体类型
    defaultResponseMediaType: 'application/json',
    // 默认请求体媒体类型
    defaultRequestMediaType: 'application/json'
  }
  }
});
```

## 自定义扩展示例

API Morph 支持强大的自定义扩展能力，可以创建自定义标签解析器：

```typescript
import { TagParser, ParsedTagData } from 'api-morph';

// 创建自定义解析器
class RateLimitTagParser extends TagParser {
  tags = ['@rateLimit']; // 支持的标签名
  priority = 60; // 解析器优先级

  async parse(tag: JSDocTag): Promise<ParsedTagData | null> {
    // 解析 @rateLimit 1000/hour 格式
    const match = tag.comment?.match(/(\d+)\/(\w+)/);
    if (!match) return null;

    const [, requests, window] = match;

    return {
      extensions: {
        'x-rate-limit': {
          requests: parseInt(requests),
          window: window
        }
      }
    };
  }
}

// 使用自定义解析器
/**
 * @operation GET /api/data
 * @summary 获取数据
 * @rateLimit 1000/hour
 */
export function getData() {
  // 函数实现
}

// 注册自定义解析器
const document = await generateDocument(documentBuilder, {
  parserOptions: {
    include: ['src/**/*.ts'],
    customParsers: [RateLimitTagParser] // 注册自定义解析器
  }
});
```

## 下一步

现在你已经了解了 API Morph 的基础用法，可以：

- 了解 [核心概念](./core-concepts.md) 来深入理解 API Morph 的工作原理
- 查看 [JSDoc 标签参考](../api/jsdoc-tags.md) 了解所有可用的标签
- 探索 [构建器 API](../api/document-builder.md) 来进行更精细的控制
- 参考 [完整示例](../examples/basic.md) 了解更多实际用例
