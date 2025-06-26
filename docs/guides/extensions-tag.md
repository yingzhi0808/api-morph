# @extensions 标签

`@extensions` 标签用于为 API 操作添加自定义扩展字段。这些扩展字段允许您添加 OpenAPI 规范之外的自定义元数据，为 API 文档提供额外的信息和功能。

## 语法格式

```typescript
/**
 * @extensions
 * [key: `x-${string}`]: any
 */
```

## 参数说明

- **仅支持 YAML 格式**：不接受任何内联参数，所有扩展字段必须在 YAML 块中定义
- **扩展字段命名**：所有扩展字段的键必须以 `x-` 开头

## 用法示例

```typescript
/**
 * @extensions
 * x-rate-limit: 100
 * x-cache-ttl: 300
 * x-requires-auth: true
 */
app.get('/api/users', (req, res) => {})
```
