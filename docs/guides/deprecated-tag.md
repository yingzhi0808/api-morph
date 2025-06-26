# @deprecated 标签

`@deprecated` 标签用于标记 API 端点为已废弃状态。被标记为废弃的 API 端点仍然可以使用，但开发者应该计划迁移到新的替代方案。这个标签不接受任何参数。

## 语法格式

```typescript
/**
 * @deprecated
 */
```

## 参数说明

- **无参数**：`@deprecated` 标签不接受任何参数，只需简单声明即可。

## 用法示例

```typescript
/**
 * @deprecated
 */
app.get('/api/v1/users', (req, res) => {})
```
