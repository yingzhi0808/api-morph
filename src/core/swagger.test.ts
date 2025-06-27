import { describe, expect, it } from "vitest";
import { type GenerateSwaggerUIOptions, generateSwaggerUI, getSwaggerUIAssetInfo } from "./swagger";

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
  });

  describe("generateSwaggerUI", () => {
    it("应该使用默认选项生成HTML", () => {
      const html = generateSwaggerUI();

      expect(html).toMatchSnapshot();
    });

    it("应该正确应用自定义URL", () => {
      const options: GenerateSwaggerUIOptions = {
        url: "/api/docs/openapi.json",
      };
      const html = generateSwaggerUI(options);

      expect(html).toMatchSnapshot();
    });

    it("应该正确应用自定义标题", () => {
      const options: GenerateSwaggerUIOptions = {
        title: "My Custom API Documentation",
      };
      const html = generateSwaggerUI(options);

      expect(html).toMatchSnapshot();
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

      expect(html).toMatchSnapshot();
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

      expect(html).toMatchSnapshot();
    });

    it("应该正确设置persistAuthorization为true", () => {
      const options: GenerateSwaggerUIOptions = {
        persistAuthorization: true,
      };
      const html = generateSwaggerUI(options);

      expect(html).toMatchSnapshot();
    });
  });
});
