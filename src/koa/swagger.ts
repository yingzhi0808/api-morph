import type Koa from "koa";
import serve from "koa-static";
import {
  type GenerateSwaggerUIHTMLOptions,
  generateSwaggerUIHTML,
  getSwaggerUIAssetDir,
} from "@/core/swagger";

/**
 * 设置 SwaggerUI 的静态资源和路由
 * @param path SwaggerUI 路径
 * @param app Koa 应用实例
 * @param options 选项
 *
 * @category Koa
 */
export function setupSwaggerUI(path: string, app: Koa, options: GenerateSwaggerUIHTMLOptions = {}) {
  const assetDir = getSwaggerUIAssetDir();

  app.use(serve(assetDir));

  app.use(async (ctx, next) => {
    if (ctx.path === path && ctx.method === "GET") {
      const html = generateSwaggerUIHTML(options);
      ctx.set("Content-Type", "text/html");
      ctx.body = html;
    } else {
      await next();
    }
  });
}
