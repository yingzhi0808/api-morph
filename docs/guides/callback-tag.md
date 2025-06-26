# @callback 标签

`@callback` 标签用于定义 API 操作中的回调对象。回调是指当特定事件发生时，API 会向客户端指定的 URL 发送 HTTP 请求。这在 webhook、异步处理和事件通知等场景中非常有用。

## 语法格式

```typescript
/**
 * @callback <callbackName>
 * CallbackObject | ReferenceObject
 */
```

## 参数说明

- **callbackName**：必需，回调的唯一标识符。
- **[CallbackObject](https://spec.openapis.org/oas/v3.1.1#callback-object)**：可选，包含回调的具体配置。
- **[ReferenceObject](https://spec.openapis.org/oas/v3.1.1#reference-object)**：可选，引用其他回调对象。


## 用法示例

### 单个回调端点

```typescript
/**
 * @callback paymentNotify
 * "{$request.body#/callbackUrl}":
 *   post:
 *     summary: "支付回调"
 *     responses:
 *       200:
 *         description: "处理成功"
 */
app.post('/payments', (req, res) => {})
```


### 多个回调端点

```typescript
/**
 * @callback multipleEndpointsCallback
 * "{$request.body#/successUrl}":
 *   post:
 *     summary: "成功回调"
 *     responses:
 *       200:
 *         description: "处理成功"
 * "{$request.body#/failureUrl}":
 *   post:
 *     summary: "失败回调"
 *     responses:
 *       200:
 *         description: "处理成功"
 */
app.post('/payments', (req, res) => {})
```

### 扩展字段

```typescript
/**
 * @callback paymentNotify
 * "{$request.body#/callbackUrl}":
 *   post:
 *     summary: "支付回调"
 *     responses:
 *       200:
 *         description: "处理成功"
 * x-provider: "stripe"
 * x-timeout: 30000
 * x-retry-count: 3
 */
app.post('/payments', (req, res) => {})
```

### 引用其他回调对象

```typescript
/**
 * @callback orderStatusCallback
 * $ref: "#/components/callbacks/OrderStatusChanged"
 */
app.post('/orders', (req, res) => {})
```


