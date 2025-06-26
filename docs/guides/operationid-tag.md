# @operationId 标签

`@operationId` 标签用于为 API 端点指定唯一的操作标识符。这个标识符在整个 API 规范中必须是唯一的，主要用于客户端代码生成和内部引用。

## 语法格式

```typescript
/**
 * @operationId <operationId>
 */
```

## 参数说明

- **operationId**：必需，指定操作的唯一标识符。

## 用法示例

```typescript
/**
 * @operationId getUserById
 */
app.get('/users/:id', (req, res) => {})
```
