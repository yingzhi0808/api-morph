# @operation 标签

`@operation` 标签用于定义 API 端点的 HTTP 方法和路径。

## 语法格式

```typescript
/**
 * @operation <METHOD> <path>
 */
```

## 参数说明

- **METHOD**：必需，指定 HTTP 请求方法。
- **path**：必需，指定 API 端点的路径，必须以 `/` 开头。路径参数必须使用 OpenAPI 规范格式（`{paramName}`），例如 `/users/{id}`。

支持以下 HTTP 方法（不区分大小写）：

- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`
- `OPTIONS`
- `HEAD`
- `TRACE`

## 用法示例

```typescript
/**
 * @operation GET /users/{id}
 */
app.get('/users/:id', (req, res) => {})
```
