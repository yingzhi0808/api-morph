# @description 标签

`@description` 标签用于为 API 端点提供详细的描述信息，可以包含多行文本、格式化内容和详细的功能说明。这是对 `@summary` 标签的补充，提供更全面的端点说明。

## 语法格式

```typescript
/**
 * @description <description>
 */
```

## 参数说明

- **description**：必需，详细说明 API 端点的功能、用法、注意事项等。

## 用法示例

### 简单描述

```typescript
/**
 * @description 根据用户ID获取用户的完整信息，包括基本资料和权限设置
 */
app.get('/users/:id', (req, res) => {})
```



### 多行描述

```typescript
/**
 * @description 返回系统中所有用户的分页列表
 *
 * 此接口支持以下功能：
 * - 分页查询，默认每页20条记录
 * - 按用户名、邮箱等字段排序
 * - 支持多种筛选条件
 *
 * 注意：需要管理员权限才能访问
 */
app.get('/users', (req, res) => {})
```

::: tip
该标签的所有参数内容包括空格和多行文本都会被完整解析，无需用引号包裹。
:::