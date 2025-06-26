# @security 标签

`@security` 标签用于为 API 操作指定安全需求。它定义了访问特定 API 端点所需的认证方案和权限范围，确保只有经过适当授权的客户端才能访问受保护的资源。

## 语法格式

```typescript
/**
 * @security <schemeName> [...scopes]
 */
```

## 参数说明

- **schemeName**：必需，安全方案的名称，必须在 OpenAPI 文档的 `securitySchemes` 中预先定义。
- **scopes**：可选，权限范围列表，适用于 OAuth2 和 OpenID Connect 等支持作用域的认证方案。

## 用法示例

### 无作用域的安全方案

```typescript
/**
 * @security bearerAuth
 */
app.get('/profile', (req, res) => {})
```

### 带单个作用域的安全方案

```typescript
/**
 * @security oauth2 admin
 */
app.get('/admin/users', (req, res) => {})
```

### 带多个作用域的安全方案

```typescript
/**
 * @security oauth2 user:create user:write admin
 */
app.post('/users', (req, res) => {})
```
