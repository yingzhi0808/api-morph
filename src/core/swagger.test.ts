import { describe, expect, it } from "vitest";
import {
  type GenerateSwaggerUIHTMLOptions,
  generateSwaggerUIHTML,
  getSwaggerUIAssetDir,
} from "./swagger";

describe("swagger", () => {
  describe("getSwaggerUIAssetPaths", () => {
    it("应该正确返回Swagger UI静态资源目录", () => {
      const assetDir = getSwaggerUIAssetDir();
      expect(assetDir).toContain("swagger-ui-dist");
    });
  });

  describe("generateSwaggerUIHTML", () => {
    it("应该使用默认选项生成HTML", () => {
      const html = generateSwaggerUIHTML();

      expect(html).toMatchSnapshot();
    });

    it("应该正确应用自定义URL", () => {
      const options: GenerateSwaggerUIHTMLOptions = {
        url: "/api/docs/openapi.json",
      };
      const html = generateSwaggerUIHTML(options);

      expect(html).toMatchSnapshot();
    });

    it("应该正确应用自定义标题", () => {
      const options: GenerateSwaggerUIHTMLOptions = {
        title: "My Custom API Documentation",
      };
      const html = generateSwaggerUIHTML(options);

      expect(html).toMatchSnapshot();
    });

    it("应该正确应用自定义CSS", () => {
      const customCss = `
        body { background-color: #f0f0f0; }
        .swagger-ui { font-family: Arial; }
      `;
      const options: GenerateSwaggerUIHTMLOptions = {
        customCss,
      };
      const html = generateSwaggerUIHTML(options);

      expect(html).toMatchSnapshot();
    });

    it("应该正确应用自定义JavaScript", () => {
      const customJs = `
        console.log("Custom JavaScript loaded");
        window.customFunction = function() { return "test"; };
      `;
      const options: GenerateSwaggerUIHTMLOptions = {
        customJs,
      };
      const html = generateSwaggerUIHTML(options);

      expect(html).toMatchSnapshot();
    });

    it("应该正确设置persistAuthorization为true", () => {
      const options: GenerateSwaggerUIHTMLOptions = {
        persistAuthorization: true,
      };
      const html = generateSwaggerUIHTML(options);

      expect(html).toMatchSnapshot();
    });
  });
});
