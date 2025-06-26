# 语法概览

api-morph 使用标准的 JSDoc 语法来解析标签，但扩展了参数格式以支持更复杂的 OpenAPI 定义。

api-morph 支持两种参数格式：**内联参数** 和 **YAML 参数**。

```typescript
/**
 * @标签名 [内联参数]
 * [YAML参数]
 */
```

## 内联参数

内联参数位于标签名后的同一行，使用空格分隔：

```typescript
/**
 * @operation GET /api/users/{id}
 * @parameter userId path required 用户ID
 * @response 200 application/json 成功响应
 */
```

上面的代码解析结果如下：

```typescript
['get', '/api/users/{id}']
['userId', 'path', 'required', '用户ID']
['200', 'application/json', '成功响应']
```

### 空格处理

当内联参数包含空格时，可以使用以下方式处理：

#### 1. 双引号或单引号包裹

```typescript
/**
 * @parameter userId path required "用户 ID 参数"
 * @response 200 'User not found error'
 */
```

上面的代码解析结果如下：

```typescript
['userId', 'path', 'required', '用户 ID 参数']
['200', 'User not found error']
```

引号内的内容会被作为一个完整的参数，空格会被保留。

#### 2. 大括号包裹

当内联参数中既包含引号又包含空格时，也可以使用大括号包裹：

```typescript
/**
 * @parameter userId path {$ref: "#/components/schemas/UserId"} 用户ID
 */
```

上面的代码解析结果如下：

```typescript
['userId', 'path', '$ref: "#/components/schemas/UserId"', '用户ID']
```

### 转义字符

在引号或大括号内，可以使用反斜杠进行转义：

```typescript
/**
 * @parameter name query "用户\"昵称\"参数"
 */
```

上面的代码解析结果如下：

```typescript
['name', 'query', '用户"昵称"参数']
```

支持的转义字符：
- `\"` → `"`
- `\'` → `'`
- `\\` → `\`
- `\{` → `{`
- `\}` → `}`

## YAML 参数

YAML 参数位于标签行的下方，支持复杂的对象结构：

```typescript
/**
 * @parameter userId path required 用户ID
 * schema:
 *   type: string
 *   format: uuid
 * example: 123e4567-e89b-12d3-a456-426614174000
 */
```

### YAML 参数优先级

YAML 参数会覆盖内联参数中的相同字段：

```typescript
/**
 * @parameter userId path required 内联参数中的描述
 * required: false
 * description: YAML中的描述
 */
```

最终 YAML 中的 `description` 和 `required` 会覆盖内联参数中的对应值。

### 多行文本支持

YAML 参数的另一个重要优势是支持多行文本，比如 Markdown 描述，这是内联参数做不到的，因为内联参数不能换行：

```typescript
/**
 * @parameter filter query 过滤条件
 * description: |
 *   用户过滤条件，支持以下字段：
 *
 *   - **status**: 用户状态 (`active`, `inactive`, `pending`)
 *   - **role**: 用户角色 (`admin`, `user`, `guest`)
 *   - **created**: 创建时间范围 (`2023-01-01,2023-12-31`)
 *
 *   示例: `status=active&role=admin`
 * schema:
 *   type: string
 */
```

上面的多行描述包含了格式化文本、列表和示例，这在内联参数中是无法实现的。

::: tip
`@description` 标签是唯一的例外，因为它只有一个参数，所以可以直接在内联参数中写多行文本：

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
```
:::

## Zod Schema 引用

在 YAML 参数中，可以通过 `{@link SchemaName}` 引用 Zod schema：

```typescript
/**
 * @response 200 用户信息
 * content:
 *   application/json:
 *     schema: {@link UserVo}
 *   application/xml:
 *     schema: {@link UserXmlVo}
 */
```

### 注意事项

要使用 `{@link}` 引用 Zod schema，需要满足以下条件：

1. **Schema 必须是 Zod 类型**：引用的对象必须是通过 `z.object()` 等方法创建的 Zod schema
2. **Zod schema 必须要命名导出**：Schema 必须通过 `export` 命名导出

::: warning
由于 api-morph 会从 Zod schema 所在文件中导入它并生成 JSON Schema，所以导出 Zod schema 的文件不能有副作用，如函数调用、数据库连接、日志输出等。这些文件应该只包含纯粹的 schema 定义。
:::

你可能会疑惑为什么要将 Zod schema 包裹在 `{@link}` 中。因为 `{@link}` 是合法的 JSDoc 语法，IDE 如 VSCode 可以识别它并提供语法高亮、悬浮提示、跳转到定义等功能，从而增强开发体验。

::: tip
在 VSCode 中你可以安装扩展 [JSDoc Link](https://marketplace.cursorapi.com/items?itemName=MuTsunTsai.jsdoc-link) 来提高 `{@link}` 注释的可读性。
:::

::: tip
如果你的项目中集成了 linter 比如 ESLint 或 Biome 等，你可能会收到类似 "unused imports" 的警告或错误，这是因为这些 linter 并不会识别到你在 JSDoc 注释中使用了导入的变量。但是 TypeScript 的语言服务器可以正确识别它，所以你需要关闭 linter 中关于 "unused imports" 的规则，开启 `tsconfig.json` 中的 `noUnusedLocals` 规则。

**Biome 配置示例：**
```json
{
  "linter": {
    "rules": {
      "correctness": {
        "noUnusedImports": "off"
      }
    }
  }
}
```

**ESLint 配置示例：**
```json
{
  "rules": {
    "unused-imports/no-unused-imports": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-unused-vars": "off"
  }
}
```

**tsconfig.json 配置示例：**
```json
{
  "compilerOptions": {
    "noUnusedLocals": true
  }
}
```
:::
