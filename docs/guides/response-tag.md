# @response 标签

`@response` 标签用于定义 API 操作的响应信息。它支持指定 HTTP 状态码、媒体类型、Schema 引用、描述信息以及响应头、链接等高级特性，为客户端提供完整的响应规范。

## 语法格式

```typescript
/**
 * @response <statusCode> [mediaType] [schema] [description]
 * ResponseObject | ReferenceObject
 */
```

## 参数说明

- **statusCode**：必需，HTTP 状态码（3位数字）或 `default`
- **mediaType**：可选，响应的媒体类型，如 `application/json`、`application/xml` 等
- **schema**：可选，Schema 引用，格式为 `{$ref: "#/components/schemas/..."}` 或 `{@link SchemaName}`
- **description**：可选，响应的描述信息（如未提供，会使用 HTTP 状态码的默认描述）
- **ResponseObject**：可选，包含完整的响应配置和扩展字段
- **ReferenceObject**：可选，引用其他响应对象

## 用法示例

### 基础响应定义

最简单的响应定义，只需指定状态码：

```typescript
/**
 * @response 200
 * @response 404 用户不存在
 * @response 500 服务器内部错误
 */
app.get('/users/:id', (req, res) => {})
```

### 完整的 YAML 配置示例

使用完整的 YAML 语法定义响应，可以提供最详细的配置：

```typescript

/**
 * @response 200 用户信息
 * content:
 *   application/json:
 *     schema:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         email:
 *           type: string
 */
app.get('/users/:id', (req, res) => {})
```

### 使用 $ref 内联语法替代 content 对象

你可以使用更简洁的内联语法，通过 `$ref` 引用已定义的 JSON Schema：

```typescript
/**
 * @response 200 application/json {$ref: "#/components/schemas/User"} 用户信息
 */
app.get('/users/:id', (req, res) => {})
```

媒体类型也支持简写形式，例如 `json` 代表 `application/json`：

```typescript
/**
 * @response 200 json {$ref: "#/components/schemas/User"} 用户信息
 */
app.get('/users/:id', (req, res) => {})
```

你也可以完全省略媒体类型，这时候会使用默认的媒体类型：

```typescript
/**
 * @response 200 {$ref: "#/components/schemas/User"} 用户信息
 */
app.get('/users/:id', (req, res) => {})
```

默认的媒体类型为 `application/json`，可以通过配置进行修改：

```typescript
const openapi = await generateDocument(
  {},
  {
    parserOptions: {
      defaultResponseMediaType: "application/json",
    },
  },
);
```

### 使用 @link 内联语法引用 Zod Schema

你也可以在内联语法中直接引用 Zod Schema 来简化写法：

```typescript
import { UserDto } from './schemas';

/**
 * @response 200 {@link UserDto} 用户信息
 */
app.get('/users/:id', (req, res) => {})
```

::: tip
除了第一个参数必须为状态码外，内联参数的顺序是无关紧要的，解析器会自动识别类型。例如 `200 json {@link UserDto} 用户信息` 和 `200 {@link UserDto} json 用户信息` 都是有效的。
:::

### 在 content 对象中使用引用

在 YAML 的 `content` 对象中，同样可以使用 `$ref` 和 `@link` 引用：

```typescript
/**
 * @response 200 用户信息
 * content:
 *   application/json:
 *     schema:
 *       $ref: "#/components/schemas/User"
 *   application/xml:
 *     schema: {@link UserDto}
 */
app.get('/users/:id', (req, res) => {})
```

需要注意的是，在内联语法中引用 schema 只会在 `content` 中创建一个 `MediaTypeObject`。如果需要支持多个媒体类型，则还是需要使用 YAML 语法来定义完整的 `content` 对象。

### 使用 ReferenceObject 引用其他 ResponseObject

你也可以直接引用已定义的 `ResponseObject` 对象：

```typescript
/**
 * @response 200
 * $ref: "#/components/responses/UserResponse"
 */
app.get('/users/:id', (req, res) => {})
```

::: warning
注意这和在 `content` 中引用 schema 是不一样的！这里引用的是完整的 `ResponseObject`，包含描述、headers、content 以及完整的响应配置，而不仅仅是数据结构的 `schema`。
:::

### 多行文本描述

和绝大多数标签一样，`@response` 标签可以在 YAML 的 `description` 中书写多行文本：

```typescript
/**
 * @response 200 {$ref: "#/components/schemas/User"}
 * description: |
 *   用户个人资料信息
 *
 *   包含以下内容：
 *   - 基本信息（姓名、邮箱、头像等）
 *   - 账户设置和权限
 *   - 最近活动记录
 *   - 统计数据概览
 */
app.get('/users/:id/profile', (req, res) => {})
```

## 简化响应标签

为了进一步简化响应定义，api-morph 提供了基于 HTTP 状态码的简化响应标签。这些标签会自动映射到对应的状态码，让代码更加简洁易读。

### 支持的简化标签

简化响应标签会自动支持所有 HTTP 状态码，主要包括：

```typescript
/**
 * @okResponse                    // 200 OK
 * @createdResponse               // 201 Created
 * @acceptedResponse              // 202 Accepted
 * @noContentResponse             // 204 No Content
 * @badRequestResponse            // 400 Bad Request
 * @unauthorizedResponse          // 401 Unauthorized
 * @paymentRequiredResponse       // 402 Payment Required
 * @forbiddenResponse             // 403 Forbidden
 * @notFoundResponse              // 404 Not Found
 * @methodNotAllowedResponse      // 405 Method Not Allowed
 * @conflictResponse              // 409 Conflict
 * @unprocessableEntityResponse   // 422 Unprocessable Entity
 * @internalServerErrorResponse   // 500 Internal Server Error
 * @notImplementedResponse        // 501 Not Implemented
 * @badGatewayResponse            // 502 Bad Gateway
 * @serviceUnavailableResponse    // 503 Service Unavailable
 */
```

### 基础用法

使用简化标签可以让响应定义更加直观：

```typescript
/**
 * @okResponse
 * @notFoundResponse
 * @internalServerErrorResponse
 */
app.get('/users/:id', (req, res) => {})
```

等价于：

```typescript
/**
 * @response 200
 * @response 404
 * @response 500
 */
app.get('/users/:id', (req, res) => {})
```

简化标签同样支持所有 `@response` 标签的特性：

```typescript
/**
 * @okResponse {@link UserDto} 用户信息
 * @notFoundResponse 用户不存在
 * @badRequestResponse {@link ErrorDto} 请求参数错误
 */
app.get('/users/:id', (req, res) => {})
```

::: info
简化响应标签的命名规则遵循 HTTP 状态码的标准描述，使用驼峰命名法并添加 `Response` 后缀。所有标准的 HTTP 状态码都会自动生成对应的简化标签。
:::
