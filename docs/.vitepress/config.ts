import { defineConfig } from "vitepress";
import typedocSidebar from "../api/typedoc-sidebar.json";

export default defineConfig({
  title: "api-morph",
  description: "TypeScript 优先的 OpenAPI 文档生成器，通过分析代码自动生成全面的 API 文档",
  base: "/api-morph/",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
    ["meta", { name: "theme-color", content: "#f59e0b" }],
  ],
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "首页", link: "/" },
      { text: "指南", link: "/guides/introduction" },
      { text: "API 文档", link: "/api/" },
    ],
    sidebar: {
      "/guides/": [
        {
          text: "基础入门",
          items: [
            { text: "介绍", link: "/guides/introduction" },
            { text: "快速开始", link: "/guides/getting-started" },
            { text: "工作原理", link: "/guides/working-principles" },
          ],
        },
        {
          text: "标签解析器",
          items: [
            { text: "语法概览", link: "/guides/syntax-overview" },
            { text: "@operation", link: "/guides/operation-tag" },
            { text: "@operationId", link: "/guides/operationid-tag" },
            { text: "@summary", link: "/guides/summary-tag" },
            { text: "@description", link: "/guides/description-tag" },
            { text: "@tags", link: "/guides/tags-tag" },
            { text: "@deprecated", link: "/guides/deprecated-tag" },
            { text: "@parameter", link: "/guides/parameter-tag" },
            { text: "@requestBody", link: "/guides/requestbody-tag" },
            { text: "@response", link: "/guides/response-tag" },
            { text: "@callback", link: "/guides/callback-tag" },
            { text: "@server", link: "/guides/server-tag" },
            { text: "@externalDocs", link: "/guides/externaldocs-tag" },
            { text: "@security", link: "/guides/security-tag" },
            { text: "@extensions", link: "/guides/extensions-tag" },
            { text: "@responsesExtensions", link: "/guides/responses-extensions-tag" },
          ],
        },
      ],
      "/api/": typedocSidebar,
    },
    socialLinks: [{ icon: "github", link: "https://github.com/yingzhi0808/api-morph" }],
    search: {
      provider: "local",
    },
    footer: {
      message: "基于 MIT 许可证发布",
      copyright: "版权所有 © 2025 Yingzhi Ji",
    },
  },
});
