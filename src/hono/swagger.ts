import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";
import {
  type GenerateSwaggerUIHTMLOptions,
  generateSwaggerUIHTML,
  getSwaggerUIAssetDir,
} from "@/core/swagger";

/**
 * 设置 SwaggerUI 的静态资源和路由
 * @param path SwaggerUI 路径
 * @param app Hono 应用实例
 * @param options 选项
 *
 * @category Hono
 */
export function setupSwaggerUI(
  path: string,
  app: Hono,
  options: GenerateSwaggerUIHTMLOptions = {},
) {
  const assetDir = getSwaggerUIAssetDir();
  const relativePath = relative(process.cwd(), assetDir);
  app.use("/*", serveStatic({ root: relativePath }));

  app.get(path, (c) => {
    const html = generateSwaggerUIHTML(options);
    return c.html(html);
  });
}
