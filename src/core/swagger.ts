import { createRequire } from "node:module";
import path from "node:path";

/**
 * generateSwaggerUI 的选项配置
 *
 * @category Core
 */
export interface GenerateSwaggerUIOptions {
  /** Swagger JSON 文件的 URL 路径，默认为 '/openapi.json' */
  url?: string;
  /** HTML 页面标题，默认为 'Swagger UI' */
  title?: string;
  /** 自定义 CSS 样式 */
  customCss?: string;
  /** 自定义 JavaScript 代码 */
  customJs?: string;
  /** If set to true, it persists authorization data and it would not be lost on browser close/refresh。默认为 false */
  persistAuthorization?: boolean;
}

/**
 * 静态资源信息
 *
 * @category Core
 */
export interface SwaggerUIAssetInfo {
  /** swagger-ui-dist 包的绝对路径 */
  assetPath: string;
  /** 主要资源文件路径 */
  files: {
    indexCss: string;
    css: string;
    bundleJs: string;
    standalonePresetJs: string;
    favicon32: string;
    favicon16: string;
  };
}

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
 *
 * @category Core
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
 *
 * @category Core
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
