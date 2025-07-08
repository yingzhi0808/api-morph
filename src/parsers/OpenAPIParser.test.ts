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

  describe("全局响应功能测试", () => {
    it("应该将全局响应应用到所有操作", async () => {
      const project = createProject();
      project.createSourceFile(
        "test.ts",
        `
/**
 * @operation get /api/users
 * @response 200 获取用户列表成功
 */
app.get("/api/users", (req, res) => {})

/**
 * @operation post /api/users
 * @response 201 创建用户成功
 */
app.post("/api/users", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder()
        .addGlobalResponse("500", { description: "内部服务器错误" })
        .addGlobalResponse("401", { description: "未授权" });

      const result = await parser.parse(builder);

      // 检查 GET /api/users 操作
      const getUsersOperation = result.paths!["/api/users"]!.get!;
      expect(getUsersOperation.responses).toHaveProperty("200");
      expect(getUsersOperation.responses).toHaveProperty("500");
      expect(getUsersOperation.responses).toHaveProperty("401");
      expect(getUsersOperation.responses["500"]).toEqual({ description: "内部服务器错误" });
      expect(getUsersOperation.responses["401"]).toEqual({ description: "未授权" });

      // 检查 POST /api/users 操作
      const createUserOperation = result.paths!["/api/users"]!.post!;
      expect(createUserOperation.responses).toHaveProperty("201");
      expect(createUserOperation.responses).toHaveProperty("500");
      expect(createUserOperation.responses).toHaveProperty("401");
      expect(createUserOperation.responses["500"]).toEqual({ description: "内部服务器错误" });
      expect(createUserOperation.responses["401"]).toEqual({ description: "未授权" });
    });

    it("操作特定的响应应该覆盖相同状态码的全局响应", async () => {
      const project = createProject();
      project.createSourceFile(
        "test.ts",
        `
/**
 * @operation get /api/users
 * @response 200 获取用户列表成功
 * @response 500 获取用户列表时发生错误
 */
app.get("/api/users", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder()
        .addGlobalResponse("500", { description: "全局内部服务器错误" })
        .addGlobalResponse("401", { description: "未授权" });

      const result = await parser.parse(builder);

      const getUsersOperation = result.paths!["/api/users"]!.get!;
      expect(getUsersOperation.responses).toHaveProperty("200");
      expect(getUsersOperation.responses).toHaveProperty("500");
      expect(getUsersOperation.responses).toHaveProperty("401");

      // 操作特定的 500 响应应该覆盖全局的 500 响应
      expect(getUsersOperation.responses["500"]).toMatchObject({
        description: "获取用户列表时发生错误",
      });
      // 全局的 401 响应应该被保留
      expect(getUsersOperation.responses["401"]).toEqual({ description: "未授权" });
    });
  });

  describe("全局参数功能测试", () => {
    it("应该将全局参数应用到所有操作", async () => {
      const project = createProject();
      project.createSourceFile(
        "test.ts",
        `
/**
 * @operation get /api/users
 * @response 200 获取用户列表成功
 */
app.get("/api/users", (req, res) => {})

/**
 * @operation post /api/users
 * @response 201 创建用户成功
 */
app.post("/api/users", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder()
        .addGlobalParameter({
          name: "Authorization",
          in: "header",
          description: "认证令牌",
          required: true,
          schema: { type: "string" },
        })
        .addGlobalParameter({
          name: "version",
          in: "query",
          description: "API版本",
          required: false,
          schema: { type: "string", example: "v1" },
        });

      const result = await parser.parse(builder);

      // 检查 GET /api/users 操作
      const getUsersOperation = result.paths!["/api/users"]!.get!;
      expect(getUsersOperation.parameters).toHaveLength(2);
      expect(getUsersOperation.parameters![0]).toMatchObject({
        name: "Authorization",
        in: "header",
        description: "认证令牌",
        required: true,
      });
      expect(getUsersOperation.parameters![1]).toMatchObject({
        name: "version",
        in: "query",
        description: "API版本",
        required: false,
      });

      // 检查 POST /api/users 操作
      const createUserOperation = result.paths!["/api/users"]!.post!;
      expect(createUserOperation.parameters).toHaveLength(2);
      expect(createUserOperation.parameters![0]).toMatchObject({
        name: "Authorization",
        in: "header",
        description: "认证令牌",
        required: true,
      });
      expect(createUserOperation.parameters![1]).toMatchObject({
        name: "version",
        in: "query",
        description: "API版本",
        required: false,
      });
    });

    it("操作特定的参数应该覆盖相同名称和位置的全局参数", async () => {
      const project = createProject();
      project.createSourceFile(
        "test.ts",
        `
/**
 * @operation get /api/users
 * @parameter version query 特定版本参数 false string
 * @response 200 获取用户列表成功
 */
app.get("/api/users", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder()
        .addGlobalParameter({
          name: "version",
          in: "query",
          description: "全局API版本",
          required: false,
          schema: { type: "string", example: "v1" },
        })
        .addGlobalParameter({
          name: "Authorization",
          in: "header",
          description: "认证令牌",
          required: true,
          schema: { type: "string" },
        });

      const result = await parser.parse(builder);

      const getUsersOperation = result.paths!["/api/users"]!.get!;
      expect(getUsersOperation.parameters).toHaveLength(2);

      // 查找 version 参数（应该被操作特定参数覆盖）
      const versionParam = getUsersOperation.parameters!.find(
        (p) => "name" in p && p.name === "version",
      );
      expect(versionParam).toMatchObject({
        name: "version",
        in: "query",
        description: "特定版本参数",
      });
      // 验证 required 字段确实被覆盖了（全局是 true，操作特定是 undefined）
      expect(versionParam).toHaveProperty("required", undefined);

      // 查找 Authorization 参数（应该保留全局参数）
      const authParam = getUsersOperation.parameters!.find(
        (p) => "name" in p && p.name === "Authorization",
      );
      expect(authParam).toMatchObject({
        name: "Authorization",
        in: "header",
        description: "认证令牌",
        required: true,
      });
    });

    it("应该支持全局参数引用对象", async () => {
      const project = createProject();
      project.createSourceFile(
        "test.ts",
        `
/**
 * @operation get /api/users
 * @response 200 获取用户列表成功
 */
app.get("/api/users", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder().addGlobalParameter({
        $ref: "#/components/parameters/Authorization",
      });

      const result = await parser.parse(builder);

      const getUsersOperation = result.paths!["/api/users"]!.get!;
      expect(getUsersOperation.parameters).toHaveLength(1);
      expect(getUsersOperation.parameters![0]).toEqual({
        $ref: "#/components/parameters/Authorization",
      });
    });

    it("应该正确添加新的操作特定参数", async () => {
      const project = createProject();
      project.createSourceFile(
        "test.ts",
        `
/**
 * @operation post /api/test
 * @parameter newParam header 新的操作参数 required string
 * @parameter anotherParam query 另一个新参数 string
 * @response 200 测试成功
 */
app.post("/api/test", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder().addGlobalParameter({
        name: "globalParam",
        in: "header",
        description: "全局参数",
        required: true,
        schema: { type: "string" },
      });

      const result = await parser.parse(builder);

      const testOperation = result.paths!["/api/test"]!.post!;
      expect(testOperation.parameters).toHaveLength(3);

      // 验证全局参数被保留
      const globalParam = testOperation.parameters!.find(
        (p) => "name" in p && p.name === "globalParam",
      );
      expect(globalParam).toMatchObject({
        name: "globalParam",
        in: "header",
        description: "全局参数",
        required: true,
      });

      // 验证新的操作特定参数被添加
      const newParam = testOperation.parameters!.find((p) => "name" in p && p.name === "newParam");
      expect(newParam).toMatchObject({
        name: "newParam",
        in: "header",
        description: "新的操作参数",
        required: true,
      });

      const anotherParam = testOperation.parameters!.find(
        (p) => "name" in p && p.name === "anotherParam",
      );
      expect(anotherParam).toMatchObject({
        name: "anotherParam",
        in: "query",
        description: "另一个新参数",
      });
    });
  });
});
