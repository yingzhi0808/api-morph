import { createProject } from "@tests/utils";
import { describe, expect, it } from "vitest";
import { OpenAPIBuilder } from "@/builders/OpenAPIBuilder";
import { OpenAPIParser } from "./OpenAPIParser";

describe("OpenAPIParser", () => {
  describe("标签解析功能测试", () => {
    it("应该忽略没有JSDoc注释的节点", async () => {
      const project = createProject();
      project.createSourceFile(
        "test.ts",
        `
app.get("/api/users", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toBeUndefined();
    });

    it("应该忽略没有标签的JSDoc注释", async () => {
      const project = createProject();
      project.createSourceFile(
        "test.ts",
        `
/**
 * 这是一个没有标签的注释
 */
app.get("/api/users", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toBeUndefined();
    });

    it("当 customFrameworkAnalyzers 未定义时应该能正常工作", async () => {
      const project = createProject();
      project.createSourceFile("test.ts", "/** @operation get / */ app.get('/', () => {})");

      const parser = new OpenAPIParser(project, {}); // customFrameworkAnalyzers is undefined
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/");
    });
  });

  describe("选项测试", () => {
    it("应该支持 include 选项", async () => {
      const project = createProject();
      project.createSourceFile("a.ts", "/** @operation get /a */ app.get('/a', () => {})");
      project.createSourceFile("b.ts", "/** @operation get /b */ app.get('/b', () => {})");

      const parser = new OpenAPIParser(project, { include: ["**/a.ts"] });
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/a");
      expect(result.paths).not.toHaveProperty("/b");
    });

    it("应该支持 exclude 选项", async () => {
      const project = createProject();
      project.createSourceFile("a.ts", "/** @operation get /a */ app.get('/a', () => {})");
      project.createSourceFile("b.ts", "/** @operation get /b */ app.get('/b', () => {})");

      const parser = new OpenAPIParser(project, { exclude: ["**/b.ts"] });
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/a");
      expect(result.paths).not.toHaveProperty("/b");
    });

    it("应该同时支持 include 和 exclude 选项", async () => {
      const project = createProject();
      project.createSourceFile("a.ts", "/** @operation get /a */ app.get('/a', () => {})");
      project.createSourceFile("b.ts", "/** @operation get /b */ app.get('/b', () => {})");
      project.createSourceFile("c.ts", "/** @operation get /c */ app.get('/c', () => {})");

      const parser = new OpenAPIParser(project, {
        include: ["**/a.ts", "**/b.ts"],
        exclude: ["**/b.ts"],
      });
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/a");
      expect(result.paths).not.toHaveProperty("/b");
      expect(result.paths).not.toHaveProperty("/c");
    });

    it("当 include 为空数组时应该处理所有文件", async () => {
      const project = createProject();
      project.createSourceFile("a.ts", "/** @operation get /a */ app.get('/a', () => {})");

      const parser = new OpenAPIParser(project, { include: [] });
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/a");
    });

    it("应该支持禁用代码分析功能", async () => {
      const project = createProject({
        tsConfigFilePath: "tsconfig.json",
        useInMemoryFileSystem: false,
        skipAddingFilesFromTsConfig: true,
      });
      project.addDirectoryAtPath("tests/fixtures");
      project.createSourceFile(
        "test.ts",
        `
import express from "express"
import { UserVo, UserIdDto, UserNotFoundVo } from "@tests/fixtures/schema"
const app = express()
/**
 * @operation get /api/users/{id}
 * @summary 获取用户信息
 * @description 获取指定用户的个人信息
 * @tags users
 * @response 200 {@link UserVo} 获取用户信息成功
 * @response 404 {@link UserNotFoundVo} 用户不存在
 */
app.get("/api/users/:id", zodValidator({
  params: UserIdDto
}), (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project, { enableCodeAnalysis: false });
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths!["/api/users/{id}"]!.get).toBeDefined();
      expect(result.paths!["/api/users/{id}"]!.get?.parameters).toBeUndefined();
    });
  });
});
