# @tags 标签

`@tags` 标签用于为 API 端点分配分类标签，帮助将相关的 API 操作组织在一起。在生成的 OpenAPI 文档中，标签会被用于分组显示相关的端点，提高文档的可读性和导航性。

## 语法格式

```typescript
/**
 * @tags <tag1> [tag2] [tag3] ...
 */
```

## 参数说明

- **tag**：必需，一个或多个用空格分隔的标签名称，至少要有一个标签。

## 用法示例

### 单个标签

```typescript
/**
 * @tags 用户管理
 */
app.get('/users/:id', (req, res) => {})
```

### 多个标签

```typescript
/**
 * @tags 身份验证 用户管理 安全
 */
app.post('/auth/login', (req, res) => {})
```

