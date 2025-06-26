# @responsesExtensions 标签

`@responsesExtensions` 标签用于为 API 操作的整个响应集合添加自定义扩展字段。与 `@extensions` 标签不同，这些扩展字段专门应用于响应对象的顶层，为响应处理提供额外的元数据和配置信息。

## 语法格式

```typescript
/**
 * @responsesExtensions
 * [key: `x-${string}`]: any
 */
```

## 参数说明

- **仅支持 YAML 格式**：不接受任何内联参数，所有扩展字段必须在 YAML 块中定义
- **值类型**：扩展字段的值可以是任意类型（字符串、数字、布尔值、对象、数组等）
- **作用范围**：扩展字段应用于整个 responses 对象，而不是单个响应

## 用法示例

```typescript
/**
 * @responsesExtensions
 * x-response-cache-policy: "public, max-age=300"
 * x-response-compression: "gzip"
 * x-default-content-type: "application/json"
 */
app.get('/api/users', (req, res) => {})
```
