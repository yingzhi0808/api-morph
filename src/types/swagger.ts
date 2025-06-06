/**
 * generateSwaggerUI 的选项配置
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
