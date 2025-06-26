# @server 标签

`@server` 标签用于定义 API 操作可用的服务器信息。它允许您指定不同的服务器 URL、环境变量、描述信息和扩展属性，为客户端提供连接到正确服务器的信息。

## 语法格式

```typescript
/**
 * @server <url> [description]
 * ServerObject
 */
```

## 参数说明

- **url**：必需，服务器 URL（必须是有效的 URL 格式）。
- **description**：可选，服务器描述信息。
- **[ServerObject](https://spec.openapis.org/oas/v3.1.1#server-object)**：可选，包含服务器信息的具体配置。

## 用法示例

### 简单的服务器信息

```typescript
/**
 * @server https://api.example.com 生产环境服务器
 */
app.get('/users', (req, res) => {})
```

### 服务器变量


```typescript
/**
 * @server https://api.example.com 生产环境服务器
 * variables:
 *   version:
 *     default: v1
 *     description: API版本
 */
app.get('/data', (req, res) => {})
```

### 扩展字段

```typescript
/**
 * @server https://api.example.com 生产环境API服务器
 * x-environment: production
 * x-region: us-east-1
 * x-load-balancer: true
 * x-ssl-enabled: true
 */
app.get('/api/stats', (req, res) => {})
```

