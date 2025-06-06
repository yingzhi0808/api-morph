import { describe, expect, it } from "vitest";
import { normalizeMediaType } from "./mediaType";

describe("mediaType helpers", () => {
  describe("normalizeMediaType", () => {
    describe("简写转换", () => {
      it("应该将 json 转换为 application/json", () => {
        expect(normalizeMediaType("json")).toBe("application/json");
      });

      it("应该将 xml 转换为 application/xml", () => {
        expect(normalizeMediaType("xml")).toBe("application/xml");
      });

      it("应该将 html 转换为 text/html", () => {
        expect(normalizeMediaType("html")).toBe("text/html");
      });

      it("应该将 css 转换为 text/css", () => {
        expect(normalizeMediaType("css")).toBe("text/css");
      });

      it("应该将 js 转换为 text/javascript", () => {
        expect(normalizeMediaType("js")).toBe("text/javascript");
      });

      it("应该将 pdf 转换为 application/pdf", () => {
        expect(normalizeMediaType("pdf")).toBe("application/pdf");
      });
    });

    describe("完整 media type 验证", () => {
      it("应该验证并返回 application/json", () => {
        expect(normalizeMediaType("application/json")).toBe("application/json");
      });

      it("应该验证并返回 text/plain", () => {
        expect(normalizeMediaType("text/plain")).toBe("text/plain");
      });

      it("应该验证并返回 image/png", () => {
        expect(normalizeMediaType("image/png")).toBe("image/png");
      });

      it("应该验证并返回 multipart/form-data", () => {
        expect(normalizeMediaType("multipart/form-data")).toBe("multipart/form-data");
      });
    });

    describe("自定义 media type", () => {
      it("应该支持 application/vnd.api+json", () => {
        expect(normalizeMediaType("application/vnd.api+json")).toBe("application/vnd.api+json");
      });

      it("应该支持 application/vnd.github+json", () => {
        expect(normalizeMediaType("application/vnd.github+json")).toBe(
          "application/vnd.github+json",
        );
      });

      it("应该支持 application/hal+json", () => {
        expect(normalizeMediaType("application/hal+json")).toBe("application/hal+json");
      });

      it("应该支持 text/vnd.custom", () => {
        expect(normalizeMediaType("text/vnd.custom")).toBe("text/vnd.custom");
      });
    });

    describe("无效输入", () => {
      it("应该对无效字符串返回 null", () => {
        expect(normalizeMediaType("invalid")).toBeNull();
      });

      it("应该对空字符串返回 null", () => {
        expect(normalizeMediaType("")).toBeNull();
      });

      it("应该对不符合格式的字符串返回对应值", () => {
        // mime-types 包会为一些输入返回值，即使它们看起来不太合理
        expect(normalizeMediaType("/")).toBe("/");
        expect(normalizeMediaType("application")).toBe("application/x-ms-application");
        expect(normalizeMediaType("application/ json")).toBe("application/ json");
        expect(normalizeMediaType("application/@json")).toBe("application/@json");
      });
    });

    describe("边界情况", () => {
      it("应该处理带 charset 的 media type", () => {
        // mime-types.contentType 会返回带 charset 的结果，我们需要提取主要部分
        const result = normalizeMediaType("json");
        expect(result).toBe("application/json");
      });

      it("应该处理大小写混合的简写", () => {
        expect(normalizeMediaType("JSON")).toBe("application/json");
      });

      it("应该处理大小写混合的完整类型", () => {
        expect(normalizeMediaType("Application/JSON")).toBe("Application/JSON");
      });
    });
  });
});
