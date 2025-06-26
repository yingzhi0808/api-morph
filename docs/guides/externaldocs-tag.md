# @externalDocs 标签

`@externalDocs` 标签用于为 API 操作添加外部文档链接。这个标签可以指向详细的 API 文档、教程、示例代码或任何相关的外部资源，帮助开发者更好地理解和使用 API。

## 语法格式

```typescript
/**
 * @externalDocs <url> [description]
 * ExternalDocumentationObject
 */
```

## 参数说明

- **url**：必需，外部文档的 URL（必须是有效的 URL 格式）
- **description**：可选，外部文档的描述信息
- **[ExternalDocumentationObject](https://spec.openapis.org/oas/v3.1.1#external-documentation-object)**：可选，包含外部文档的具体配置。

## 用法示例

### 简单的外部文档

```typescript
/**
 * @externalDocs https://docs.example.com/payments/integration 支付集成指南
 */
app.post('/payments', (req, res) => {})
```

### 多行描述文本

```typescript
/**
 * @externalDocs https://docs.example.com/user-management/api
 * description: |
 *   用户管理 API 完整文档
 *
 *   包含以下内容：
 *   - 用户认证和授权
 *   - 用户信息管理
 *   - 权限设置和角色管理
 *   - 最佳实践和示例代码
 */
app.get('/users', (req, res) => {})
```

### 扩展字段

```typescript
/**
 * @externalDocs https://docs.example.com/analytics
 * x-version: "2.0"
 * x-format: "openapi"
 * x-language: "zh-CN"
 * x-last-updated: "2024-01-15"
 */
app.get('/analytics', (req, res) => {})
```

