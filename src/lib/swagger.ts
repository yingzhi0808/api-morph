import { createRequire } from "node:module";
import path from "node:path";
import type { GenerateSwaggerUIOptions, SwaggerUIAssetInfo } from "@/types";

/**
 * 获取 swagger-ui-dist 包的路径。
 * @returns swagger-ui-dist 包的绝对路径。
 */
function getSwaggerUIAssetPath() {
  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve("swagger-ui-dist/package.json");
  return path.dirname(packageJsonPath);
}

/**
 * 获取 Swagger UI 静态资源信息。
 * @returns 包含资源路径和文件信息的对象。
 */
export function getSwaggerUIAssetInfo(): SwaggerUIAssetInfo {
  const assetPath = getSwaggerUIAssetPath();

  return {
    assetPath,
    files: {
      indexCss: path.join(assetPath, "index.css"),
      css: path.join(assetPath, "swagger-ui.css"),
      bundleJs: path.join(assetPath, "swagger-ui-bundle.js"),
      standalonePresetJs: path.join(assetPath, "swagger-ui-standalone-preset.js"),
      favicon32: path.join(assetPath, "favicon-32x32.png"),
      favicon16: path.join(assetPath, "favicon-16x16.png"),
    },
  };
}

/**
 * 生成 Swagger UI 的 HTML 字符串。
 * @param options wagger UI 配置选项。
 * @returns 完整的 Swagger UI HTML 字符串。
 */
export function generateSwaggerUI(options: GenerateSwaggerUIOptions = {}) {
  const {
    url = "/openapi.json",
    title = "Swagger UI",
    customCss = "",
    customJs = "",
    persistAuthorization = false,
  } = options;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32">
  <link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16">
  <link rel="stylesheet" href="./swagger-ui.css">
  <link rel="stylesheet" href="./index.css">
  ${customCss ? `<style>\n${customCss}\n</style>` : ""}
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="./swagger-ui-bundle.js"></script>
  <script src="./swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      const ui = SwaggerUIBundle({
        url: "${url}",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: ${persistAuthorization}
      });

      window.ui = ui;
    };
    ${customJs}
  </script>
</body>
</html>`;

  return html;
}
