# @parameter 标签

`@parameter` 标签用于定义 API 接口的参数信息。它支持指定参数名称、位置、类型、Schema 引用、描述信息和是否必需等属性，涵盖路径参数、查询参数、请求头参数和 Cookie 参数等多种参数类型。

## 语法格式

```typescript
/**
 * @parameter <name> <in> [required] [schema] [description]
 * ParameterObject | ReferenceObject
 */
```

## 参数说明

- **name**：必需，参数名称，必须是有效的标识符
- **in**：必需，参数位置，支持 `path`、`query`、`header`、`cookie`
- **required**：可选，是否必需，路径参数默认为 `true`
- **schema**：可选，参数 Schema 引用，格式为 `{$ref: "#/components/schemas/..."}` 或 `{@link SchemaName}`
- **description**：可选，参数描述信息
- **ParameterObject**：可选，包含参数的完整配置和扩展字段
- **ReferenceObject**：可选，引用其他参数对象

## 用法示例

### 基础参数定义

最简单的参数定义，只需指定名称和位置：

```typescript
/**
 * @parameter userId path 用户ID
 * @parameter limit query 分页大小
 * @parameter Authorization header 认证令牌
 * @parameter sessionId cookie 会话ID
 */
app.get('/users/:userId', (req, res) => {})
```

### 完整的 YAML 配置示例

使用完整的 YAML 语法定义参数，可以提供最详细的配置：

```typescript
/**
 * @parameter limit query required 分页大小
 * schema:
 *   type: integer
 *   minimum: 1
 *   maximum: 100
 *   default: 10
 *   example: 20
 * @parameter tags query 标签过滤
 * style: form
 * explode: true
 * schema:
 *   type: array
 *   items:
 *     type: string
 *   example: ["tech", "javascript"]
 */
app.get('/users', (req, res) => {})
```

### 使用 $ref 内联语法替代 schema 对象

你可以使用更简洁的内联语法，通过 `$ref` 引用已定义的 JSON Schema：

```typescript
/**
 * @parameter userId path {$ref: "#/components/schemas/UserId"} required 用户ID
 * @parameter filter query {$ref: "#/components/schemas/UserFilter"} 过滤条件
 */
app.get('/users/:userId', (req, res) => {})
```

### 使用 @link 内联语法引用 Zod Schema

你也可以在内联语法中直接引用 Zod Schema 来简化写法：

```typescript
import { UserIdDto, UserFilterDto } from './schemas';

/**
 * @parameter userId path {@link UserIdDto} 用户ID
 * @parameter filter query {@link UserFilterDto} 用户过滤条件
 */
app.get('/users/:userId', (req, res) => {})
```

::: tip
除了前两个参数（`name` 和 `in`）必须按顺序外，其余内联参数的顺序是无关紧要的，解析器会自动识别类型。例如 `userId path 用户ID required` 和 `userId path required 用户ID` 都是有效的。
:::

### 在 schema 对象中使用引用

在 YAML 的 `schema` 对象中，同样可以使用 `$ref` 和 `@link` 引用：

```typescript
/**
 * @parameter userId path 用户ID
 * schema:
 *   $ref: "#/components/schemas/UserId"
 * @parameter filter query 过滤条件
 * schema: {@link UserFilterDto}
 */
app.get('/users/:userId', (req, res) => {})
```

### 使用 ReferenceObject 引用其他 ParameterObject

你也可以直接引用已定义的 `ParameterObject` 对象：

```typescript
/**
 * @parameter
 * $ref: "#/components/parameters/LimitParameter"
 * @parameter
 * $ref: "#/components/parameters/OffsetParameter"
 */
app.get('/users', (req, res) => {})
```

::: warning
注意这和在 `schema` 中引用 schema 是不一样的！这里引用的是完整的 `ParameterObject`，包含名称、位置、描述、是否必需以及完整的 schema 配置，而不仅仅是数据结构的 `schema`。
:::

### 多行文本描述

和绝大多数标签一样，`@parameter` 标签可以在 YAML 的 `description` 中书写多行文本：

```typescript
/**
 * @parameter filter query {@link UserFilter} required
 * description: |
 *   复合用户过滤条件
 *
 *   支持以下过滤选项：
 *   - status: 用户状态 (active, inactive, pending)
 *   - role: 用户角色 (admin, user, guest)
 *   - dateRange: 注册日期范围
 *   - keywords: 关键词搜索（支持模糊匹配）
 *   - sortBy: 排序字段和方向
 */
app.get('/users', (req, res) => {})
```
