import type { Express } from "express";
import express from "express";
import {
  type GenerateSwaggerUIHTMLOptions,
  generateSwaggerUIHTML,
  getSwaggerUIAssetDir,
} from "@/core/swagger";

/**
 * 设置 SwaggerUI 的静态资源和路由
 * @param path SwaggerUI 路径
 * @param app Express 应用实例
 * @param options 选项
 *
 * @category Express
 */
export function setupSwaggerUI(
  path: string,
  app: Express,
  options: GenerateSwaggerUIHTMLOptions = {},
) {
  const assetDir = getSwaggerUIAssetDir();

  app.use(express.static(assetDir));

  app.get(path, (_req, res) => {
    const html = generateSwaggerUIHTML(options);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });
}
