# @requestBody 标签

`@requestBody` 标签用于定义 API 操作的请求体信息。它支持灵活的简化语法，可以指定媒体类型、Schema 引用、描述信息和是否必需等属性，为客户端提供清晰的请求体规范。

## 语法格式

```typescript
/**
 * @requestBody [mediaType] [schema] [description] [required]
 * RequestBodyObject | ReferenceObject
 */
```

## 参数说明

- **mediaType**：可选，请求体的媒体类型，如 `application/json`、`application/xml` 等
- **schema**：可选，Schema 引用，格式为 `{$ref: "#/components/schemas/..."}` 或 `{@link SchemaName}`
- **description**：可选，请求体的描述信息
- **required**：可选，指定请求体是否必需
- **RequestBodyObject**：可选，请求体对象
- **ReferenceObject**：可选，引用对象

## 用法示例

### 完整的 YAML 配置示例

使用完整的 YAML 语法定义请求体，可以提供最详细的配置：

```typescript
/**
 * @requestBody required 用户创建信息
 * content:
 *   application/json:
 *     schema:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: "用户姓名"
 *         email:
 *           type: string
 *           format: email
 *           description: "用户邮箱"
 *         age:
 *           type: integer
 *           minimum: 18
 *           description: "用户年龄"
 *       required:
 *         - name
 *         - email
 */
app.post('/users', (req, res) => {})
```

### 使用 $ref 内联语法替代 content 对象

你可以使用更简洁的内联语法，通过 `$ref` 引用已定义的 JSON Schema：

```typescript
/**
 * @requestBody application/json {$ref: "#/components/schemas/Product"} required 产品信息
 */
app.post('/products', (req, res) => {})
```

媒体类型也支持简写形式，例如 `json` 代表 `application/json`：

```typescript
/**
 * @requestBody json {$ref: "#/components/schemas/Order"} required 订单信息
 */
app.post('/orders', (req, res) => {})
```

你也可以完全省略媒体类型，这时候会使用默认的媒体类型：

```typescript
/**
 * @requestBody {$ref: "#/components/schemas/User"} required 用户信息
 */
app.post('/users', (req, res) => {})
```

默认的媒体类型为 `application/json`，可以通过配置进行修改：

```typescript
const openapi = await generateDocument(
  {},
  {
    parserOptions: {
      defaultRequestBodyMediaType: "application/json",
    },
  },
);
```

### 使用 @link 内联语法引用 Zod Schema

你也可以在内联语法中直接引用 Zod Schema 来简化写法：

```typescript
import { CreateUserDto } from "./schemas";

/**
 * @requestBody {@link CreateUserDto} required 用户创建信息
 */
app.post('/users', (req, res) => {})
```

::: tip
内联参数的顺序是无关紧要的，解析器会自动识别类型。例如 `required {@link CreateUserDto} json 用户信息` 和 `json {@link CreateUserDto} required 用户信息` 都是有效的。
:::

### 在 content 对象中使用引用

在 YAML 的 `content` 对象中，同样可以使用 `$ref` 和 `@link` 引用：

```typescript
/**
 * @requestBody required 用户更新信息
 * content:
 *   application/json:
 *     schema:
 *       $ref: "#/components/schemas/UpdateUser"
 *   application/xml:
 *     schema: {@link UpdateUserDto}
 */
app.put('/users/:id', (req, res) => {})
```

需要注意的是，在内联语法中引用 schema 只会在 `content` 中创建一个 `MediaTypeObject`。如果需要支持多个媒体类型，则还是需要使用 YAML 语法来定义完整的 `content` 对象。

### 使用 ReferenceObject 引用其他 RequestBodyObject

你也可以直接引用已定义的 `RequestBodyObject` 对象：

```typescript
/**
 * @requestBody
 * $ref: "#/components/requestBodies/UserCreationRequest"
 */
app.post('/users', (req, res) => {})
```

::: warning
注意这和在 `content` 中引用 schema 是不一样的！这里引用的是完整的 `RequestBodyObject`，包含描述、是否必需以及完整的 content 配置，而不仅仅是数据结构的 schema。
:::

### 多行文本描述

和绝大多数标签一样，`@requestBody` 标签可以在 YAML 的 `description` 中书写多行文本：

```typescript
/**
 * @requestBody {$ref: "#/components/schemas/Order"} required
 * description: |
 *   订单创建请求体
 *
 *   需要包含以下信息：
 *   - 商品列表和数量
 *   - 收货地址信息
 *   - 支付方式选择
 *   - 优惠券或折扣码（可选）
 */
app.post('/orders', (req, res) => {})
```

