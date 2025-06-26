# @summary 标签

`@summary` 标签用于为 API 端点提供简短的摘要描述，通常用一句话概括该端点的主要功能。这是 OpenAPI 规范中的标准字段，会显示在 API 文档的操作标题中。

## 语法格式

```typescript
/**
 * @summary <summary>
 */
```

## 参数说明

- **summary**：必需，用一句话描述 API 端点的主要功能。

## 用法示例

```typescript
/**
 * @summary 获取用户信息
 */
app.get('/users/:id', (req, res) => {})
```
