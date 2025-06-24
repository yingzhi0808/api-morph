---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "api-morph"
  text: "TypeScript 优先的 OpenAPI 文档生成器"
  tagline: "通过分析代码自动生成全面的API文档，让文档与代码保持同步"
  image:
    src: /logo.svg
    alt: api-morph Logo
  actions:
    - theme: brand
      text: 快速开始
      link: /guides/getting-started
    - theme: alt
      text: 查看示例
      link: /examples/basic

features:
  - title: 📝 JSDoc 驱动的智能文档生成
    details: 直接在代码中使用 JSDoc 注释描述 API，自动转换为标准的 OpenAPI 3.1 文档。支持 @operation、@response、@parameter 等标签
  - title: 🤖 代码结构智能分析
    details: 基于代码静态分析技术，自动识别函数调用签名、函数体内的代码结构，智能推断 HTTP 方法、路径、请求体和响应结构，减少手动配置工作
  - title: 🎯 零侵入式集成
    details: 无需修改现有代码结构，不依赖特定的控制器类或装饰器语法。与你现有的开发习惯完美融合，保持代码的简洁和可维护性
  - title: 🛡️ Zod Schema 原生支持
    details: 深度整合 Zod 类型验证库，直接使用 Zod schema 定义 API 数据结构。享受类型安全的同时，自动生成准确的 JSON Schema
  - title: 🔌 多框架无缝适配
    details: 支持 Express、Fastify、Koa 等主流 Node.js 框架。提供统一的 API 接口，让你在不同项目间轻松复用文档生成方案
  - title: ⚙️ 灵活的定制化能力
    details: 插件化架构支持自定义标签解析器，可扩展新的 JSDoc 标签功能。提供丰富的配置选项，满足不同项目的个性化需求
---
