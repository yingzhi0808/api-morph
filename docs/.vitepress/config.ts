import { defineConfig } from "vitepress";

export default defineConfig({
  title: "API Morph",
  description: "TypeScript 优先的 OpenAPI 文档生成器，通过分析代码自动生成全面的 API 文档",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
    ["meta", { name: "theme-color", content: "#f59e0b" }],
  ],
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "首页", link: "/" },
      { text: "指南", link: "/guides/introduction" },
    ],
    sidebar: {
      "/guides/": [
        {
          text: "基础",
          items: [
            { text: "介绍", link: "/guides/introduction" },
            { text: "快速开始", link: "/guides/getting-started" },
          ],
        },
        {
          text: "进阶",
          items: [],
        },
      ],
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
