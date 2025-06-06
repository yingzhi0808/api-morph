import { describe, expect, it } from "vitest";
import type { GenerateSwaggerUIOptions } from "@/types";
import { generateSwaggerUI, getSwaggerUIAssetInfo } from "./swagger";

describe("swagger", () => {
  describe("getSwaggerUIAssetInfo", () => {
    it("应该正确返回Swagger UI资源信息", () => {
      const assetInfo = getSwaggerUIAssetInfo();

      expect(assetInfo).toBeDefined();
      expect(assetInfo.assetPath).toBeDefined();
      expect(typeof assetInfo.assetPath).toBe("string");
      expect(assetInfo.assetPath.length).toBeGreaterThan(0);

      expect(assetInfo.files).toBeDefined();
      expect(assetInfo.files.indexCss).toBeDefined();
      expect(assetInfo.files.css).toBeDefined();
      expect(assetInfo.files.bundleJs).toBeDefined();
      expect(assetInfo.files.standalonePresetJs).toBeDefined();
      expect(assetInfo.files.favicon32).toBeDefined();
      expect(assetInfo.files.favicon16).toBeDefined();

      // 验证文件路径包含正确的文件名
      expect(assetInfo.files.indexCss).toContain("index.css");
      expect(assetInfo.files.css).toContain("swagger-ui.css");
      expect(assetInfo.files.bundleJs).toContain("swagger-ui-bundle.js");
      expect(assetInfo.files.standalonePresetJs).toContain("swagger-ui-standalone-preset.js");
      expect(assetInfo.files.favicon32).toContain("favicon-32x32.png");
      expect(assetInfo.files.favicon16).toContain("favicon-16x16.png");

      // 验证所有文件路径都以assetPath开头
      expect(assetInfo.files.indexCss).toContain(assetInfo.assetPath);
      expect(assetInfo.files.css).toContain(assetInfo.assetPath);
      expect(assetInfo.files.bundleJs).toContain(assetInfo.assetPath);
      expect(assetInfo.files.standalonePresetJs).toContain(assetInfo.assetPath);
      expect(assetInfo.files.favicon32).toContain(assetInfo.assetPath);
      expect(assetInfo.files.favicon16).toContain(assetInfo.assetPath);
    });

    it("应该在多次调用时返回一致的结果", () => {
      const assetInfo1 = getSwaggerUIAssetInfo();
      const assetInfo2 = getSwaggerUIAssetInfo();

      expect(assetInfo1.assetPath).toBe(assetInfo2.assetPath);
      expect(assetInfo1.files.indexCss).toBe(assetInfo2.files.indexCss);
      expect(assetInfo1.files.css).toBe(assetInfo2.files.css);
      expect(assetInfo1.files.bundleJs).toBe(assetInfo2.files.bundleJs);
      expect(assetInfo1.files.standalonePresetJs).toBe(assetInfo2.files.standalonePresetJs);
      expect(assetInfo1.files.favicon32).toBe(assetInfo2.files.favicon32);
      expect(assetInfo1.files.favicon16).toBe(assetInfo2.files.favicon16);
    });
  });

  describe("generateSwaggerUI", () => {
    it("应该使用默认选项生成HTML", () => {
      const html = generateSwaggerUI();

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<html lang="en">');
      expect(html).toContain("<title>Swagger UI</title>");
      expect(html).toContain('url: "/openapi.json"');
      expect(html).toContain("persistAuthorization: false");
      expect(html).toContain('href="./favicon-32x32.png"');
      expect(html).toContain('href="./favicon-16x16.png"');
      expect(html).toContain('href="./swagger-ui.css"');
      expect(html).toContain('href="./index.css"');
      expect(html).toContain('src="./swagger-ui-bundle.js"');
      expect(html).toContain('src="./swagger-ui-standalone-preset.js"');
      expect(html).toContain('<div id="swagger-ui"></div>');
    });

    it("应该正确应用自定义URL", () => {
      const options: GenerateSwaggerUIOptions = {
        url: "/api/docs/openapi.json",
      };

      const html = generateSwaggerUI(options);

      expect(html).toContain('url: "/api/docs/openapi.json"');
    });

    it("应该正确应用自定义标题", () => {
      const options: GenerateSwaggerUIOptions = {
        title: "My Custom API Documentation",
      };

      const html = generateSwaggerUI(options);

      expect(html).toContain("<title>My Custom API Documentation</title>");
    });

    it("应该正确应用自定义CSS", () => {
      const customCss = `
        body { background-color: #f0f0f0; }
        .swagger-ui { font-family: Arial; }
      `;
      const options: GenerateSwaggerUIOptions = {
        customCss,
      };

      const html = generateSwaggerUI(options);

      expect(html).toContain("<style>");
      expect(html).toContain(customCss);
      expect(html).toContain("</style>");
    });

    it("应该正确应用自定义JavaScript", () => {
      const customJs = `
        console.log("Custom JavaScript loaded");
        window.customFunction = function() { return "test"; };
      `;
      const options: GenerateSwaggerUIOptions = {
        customJs,
      };

      const html = generateSwaggerUI(options);

      expect(html).toContain(customJs);
    });

    it("应该正确设置persistAuthorization为true", () => {
      const options: GenerateSwaggerUIOptions = {
        persistAuthorization: true,
      };

      const html = generateSwaggerUI(options);

      expect(html).toContain("persistAuthorization: true");
    });

    it("应该正确应用所有自定义选项", () => {
      const options: GenerateSwaggerUIOptions = {
        url: "/custom/openapi.json",
        title: "Complete Custom API",
        customCss: "body { margin: 0; }",
        customJs: "console.log('loaded');",
        persistAuthorization: true,
      };

      const html = generateSwaggerUI(options);

      expect(html).toContain("<title>Complete Custom API</title>");
      expect(html).toContain('url: "/custom/openapi.json"');
      expect(html).toContain("persistAuthorization: true");
      expect(html).toContain("<style>");
      expect(html).toContain("body { margin: 0; }");
      expect(html).toContain("</style>");
      expect(html).toContain("console.log('loaded');");
    });

    it("应该在没有自定义CSS时不包含style标签", () => {
      const options: GenerateSwaggerUIOptions = {
        customCss: "",
      };

      const html = generateSwaggerUI(options);

      expect(html).not.toContain("<style>");
      expect(html).not.toContain("</style>");
    });

    it("应该在没有自定义CSS时不包含style标签（undefined）", () => {
      const options: GenerateSwaggerUIOptions = {
        customCss: undefined,
      };

      const html = generateSwaggerUI(options);

      expect(html).not.toContain("<style>");
      expect(html).not.toContain("</style>");
    });

    it("应该正确处理空的自定义JavaScript", () => {
      const options: GenerateSwaggerUIOptions = {
        customJs: "",
      };

      const html = generateSwaggerUI(options);

      // 应该包含基本的JavaScript结构，但不包含额外的自定义代码
      expect(html).toContain("window.onload = () => {");
      expect(html).toContain("window.ui = ui;");
      expect(html).toContain("};");
    });

    it("应该生成有效的HTML结构", () => {
      const html = generateSwaggerUI();

      // 检查基本HTML结构
      expect(html).toMatch(/<!DOCTYPE html>/);
      expect(html).toMatch(/<html lang="en">/);
      expect(html).toMatch(/<head>/);
      expect(html).toMatch(/<\/head>/);
      expect(html).toMatch(/<body>/);
      expect(html).toMatch(/<\/body>/);
      expect(html).toMatch(/<\/html>/);

      // 检查必要的meta标签
      expect(html).toContain('<meta charset="UTF-8">');

      // 检查必要的link标签
      expect(html).toContain('rel="icon"');
      expect(html).toContain('rel="stylesheet"');

      // 检查必要的script标签
      expect(html).toContain('<script src="./swagger-ui-bundle.js"></script>');
      expect(html).toContain('<script src="./swagger-ui-standalone-preset.js"></script>');
    });

    it("应该正确配置SwaggerUIBundle", () => {
      const html = generateSwaggerUI();

      expect(html).toContain("SwaggerUIBundle({");
      expect(html).toContain('dom_id: "#swagger-ui"');
      expect(html).toContain("deepLinking: true");
      expect(html).toContain("SwaggerUIBundle.presets.apis");
      expect(html).toContain("SwaggerUIStandalonePreset");
      expect(html).toContain("SwaggerUIBundle.plugins.DownloadUrl");
      expect(html).toContain('layout: "StandaloneLayout"');
    });

    it("应该正确处理特殊字符转义", () => {
      const options: GenerateSwaggerUIOptions = {
        title: 'API "Documentation" & Guide',
        customCss: "/* Comment with 'quotes' */",
        customJs: 'console.log("Hello \\"World\\"");',
      };

      const html = generateSwaggerUI(options);

      expect(html).toContain('API "Documentation" & Guide');
      expect(html).toContain("/* Comment with 'quotes' */");
      expect(html).toContain('console.log("Hello \\"World\\"");');
    });
  });
});
