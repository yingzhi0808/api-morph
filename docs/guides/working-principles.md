# 工作原理

api-morph 采用双层解析架构来生成 OpenAPI 对象：**标签解析器** 和 **代码分析器**。

## 标签解析器

标签解析器通过解析 JSDoc 注释中的 OpenAPI 标签生成 OpenAPI 对象。

```typescript
/**
 * @operation GET /api/users/{id}
 * @summary 获取用户信息
 * @description 获取指定用户的个人信息
 * @tags users
 * @parameter id path required 用户ID
 * schema:
 *   type: string
 *   format: uuid
 * example: 123e4567-e89b-12d3-a456-426614174000
 * @response 200 获取用户信息成功
 * content:
 *   application/json:
 *     schema:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 用户ID
 *           examples: ["123e4567-e89b-12d3-a456-426614174000"]
 *         email:
 *           type: string
 *           description: 用户邮箱
 *           examples: ["john.doe@example.com"]
 *         username:
 *           type: string
 *           description: 用户名
 *           examples: ["John Doe"]
 *       required: [id, email, username]
 */
app.get("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { email, username } = req.body;

  res.json({
    id,
    email,
    username,
  });
});
```

以上代码最终会生成一个这样的 JSON 对象：

```json
{
  "paths": {
    "/api/users/{id}": {
      "get": {
        "responses": {
          "200": {
            "description": "获取用户信息成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "format": "uuid",
                      "description": "用户ID",
                      "examples": ["123e4567-e89b-12d3-a456-426614174000"]
                    },
                    "email": {
                      "type": "string",
                      "description": "用户邮箱",
                      "examples": ["john.doe@example.com"]
                    },
                    "username": {
                      "type": "string",
                      "description": "用户名",
                      "examples": ["John Doe"]
                    }
                  },
                  "required": ["id", "email", "username"]
                }
              }
            }
          }
        },
        "tags": ["users"],
        "summary": "获取用户信息",
        "description": "获取指定用户的个人信息",
        "operationId": "getApiUsersById",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "用户ID",
            "schema": {
              "type": "string",
              "format": "uuid"
            },
            "example": "123e4567-e89b-12d3-a456-426614174000"
          }
        ]
      }
    }
  },
  "tags": [
    {
      "name": "users"
    }
  ]
}
```

`paths` 字段下所有的对象都可以通过 JSDoc 标签来定义，至于其他文档根级别的对象，可以通过 `generateDocument` 函数的第一个参数来定义。

## 代码分析器

代码分析器通过分析代码中的相关信息自动生成 OpenAPI 对象。

::: code-group

```typescript [index.ts]
import { zodValidator } from "api-morph/express";
import express from "express";
import { UserIdDto } from "./schema";

const app = express();

/**
 * @summary 获取用户信息
 */
app.get(
  "/api/users/:id",
  zodValidator({
    params: UserIdDto,
  }),
  (req, res) => {},
);
```

```typescript [schema.ts]
import z from "zod/v4";

export const UserIdDto = z.object({
  id: z.uuid().meta({ description: "用户ID", examples: ["123e4567-e89b-12d3-a456-426614174000"] }),
});
```

:::

分析上面的代码，代码分析器可以分析出以下信息：

- HTTP 方法：`GET`
- API 路径：`/api/users/:id`
- operationId：`getApiUsersById`
- path 参数：`params`

最终会生成一个这样的 JSON 对象：

```json
{
  "paths": {
    "/api/users/{id}": {
      "get": {
        "responses": {},
        "summary": "获取用户信息",
        "operationId": "getApiUsersById",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "uuid",
              "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$"
            },
            "description": "用户ID",
            "examples": ["123e4567-e89b-12d3-a456-426614174000"]
          }
        ]
      }
    }
  },
  "components": {
    "schemas": {
      "UserIdDto": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
          "id": {
            "description": "用户ID",
            "examples": ["123e4567-e89b-12d3-a456-426614174000"],
            "type": "string",
            "format": "uuid",
            "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000)$"
          }
        },
        "required": ["id"],
        "additionalProperties": false
      }
    }
  }
}
```

::: warning
代码分析器只会处理带有 JSDoc 注释的路由。如果你希望代码分析器分析某个路由，**必须至少在该路由上面添加一个 JSDoc 标签**（如 `@summary`、`@description` 等）。

```typescript
// ❌ 没有 JSDoc 注释，代码分析器会忽略这个路由
app.get('/api/users', getUserList);

// ✅ 有 JSDoc 注释，代码分析器会处理这个路由
/**
 * @summary 获取用户列表
 */
app.get('/api/users', getUserList);
```
:::

目前代码分析器只会提取以下信息：

- **HTTP 方法**：从路由定义中自动识别（如 `app.get()`、`app.post()` 等）
- **API 路径**：从路由路径中提取并转换为 OpenAPI 格式（如 `/users/:id` → `/users/{id}`）
- **请求参数**：从 `zodValidator` 中间件中提取参数验证规则
  - `params`：路径参数
  - `query`：查询参数
  - `body`：请求体参数

其他信息（如响应定义、操作描述、标签等）需要通过 JSDoc 标签来提供。

代码分析器默认是开启的，你也可以通过 `parserOptions` 选项来关闭它：

```typescript
const openapi = await generateDocument(
  {},
  {
    parserOptions: {
      enableCodeAnalysis: false,  // 关闭代码分析器
    },
  },
);
```

当关闭代码分析器后，所有 OpenAPI 信息都需要通过 JSDoc 标签来提供。

## 组合使用

标签解析器和代码分析器是可以相互组合的：

- **代码分析器可以减少部分 JSDoc 注释的编写**：自动提取 HTTP 方法、API 路径和请求参数，无需手动编写对应的标签
- **标签解析器可以补充代码分析器无法提取的信息**：提供响应定义、操作描述、标签等文档信息
- **标签解析器会覆盖代码分析器中相同的结果**：当两者提供相同类型信息时，标签解析器优先，这样用户可以覆盖代码分析器的结果

```typescript
/**
 * @operation POST /api/v2/users    // 👈 覆盖 HTTP 方法和路径
 * @operationId createUserV2        // 👈 覆盖自动生成的 operationId
 * @summary 创建新用户
 */
app.get('/api/users', zodValidator({  // 👈 代码分析器：GET /api/users
  body: UserCreateDto
}), createUser);

// 最终结果：
// - HTTP 方法：POST（标签解析器覆盖）
// - API 路径：/api/v2/users（标签解析器覆盖）
// - operationId：createUserV2（标签解析器覆盖）
// - 请求体参数：UserCreateDto（代码分析器提供）
```

这种组合方式让你既能享受代码分析器的便利，又保持对最终结果的完全控制。
