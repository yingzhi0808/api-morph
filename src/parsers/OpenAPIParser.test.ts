import { createProject } from "@tests/utils";
import { describe, expect, it } from "vitest";
import { OpenAPIBuilder } from "@/builders/OpenAPIBuilder";
import { OpenAPIParser } from "./OpenAPIParser";

describe("OpenAPIParser", () => {
  describe("标签解析功能测试", () => {
    it("应该解析包含JSON Schema的JSDoc注释", async () => {
      const project = createProject();
      project.createSourceFile(
        "test.ts",
        `
/**
 * @operation put /api/users/{id}
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @operationId updateUser
 * @tags users
 * @deprecated
 * @parameter id path required 用户ID
 * schema:
 *   type: string
 *   format: uuid
 * example: 123e4567-e89b-12d3-a456-426614174000
 * @requestBody required 用户更新数据
 * content:
 *   application/json:
 *     schema:
 *       type: object
 *       required: [email]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: 用户邮箱地址
 *           examples: [john.doe@example.com]
 *         displayName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: 用户显示名称
 *           examples: [John Doe]
 *         avatar:
 *           type: string
 *           format: uri
 *           description: 头像URL
 *           examples: [https://cdn.example.com/avatars/user123.jpg]
 * @response 200 更新用户信息成功
 * content:
 *   application/json:
 *     schema:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 是否成功
 *           examples: [true]
 *         data:
 *           type: object
 *           description: 返回数据
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               description: 用户ID
 *               examples: [123e4567-e89b-12d3-a456-426614174000]
 * @response 404 用户不存在
 * content:
 *   application/json:
 *     schema:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 是否成功
 *           examples: [false]
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               description: 错误码
 *               examples: [USER_NOT_FOUND]
 *             message:
 *               type: string
 *               description: 错误消息
 *               examples: [指定的用户不存在]
 */
app.put("/api/users/:id", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result).toMatchSnapshot();
    });

    it("应该解析包含内联schema的JSDoc注释", async () => {
      const project = createProject();
      project.createSourceFile(
        "test.ts",
        `
/**
 * @operation put /api/users/{id}
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @operationId updateUser
 * @tags users
 * @deprecated
 * @parameter id path required 用户ID
 * schema:
 *   type: string
 *   format: uuid
 * example: 123e4567-e89b-12d3-a456-426614174000
 * @requestBody {$ref: "#/components/schemas/UpdateUserDto"} required 用户更新数据
 * @response 200 {$ref: "#/components/schemas/UpdateUserVo"} 更新用户信息成功
 * @response 404 {$ref: "#/components/schemas/UserNotFoundVo"} 用户不存在
 */
app.put("/api/users/:id", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder()
        .addSchemaToComponents("UpdateUserDto", {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "用户邮箱地址",
              examples: ["john.doe@example.com"],
            },
            displayName: {
              type: "string",
              minLength: 2,
              maxLength: 50,
              description: "用户显示名称",
              examples: ["John Doe"],
            },
            avatar: {
              type: "string",
              format: "uri",
              description: "头像URL",
              examples: ["https://cdn.example.com/avatars/user123.jpg"],
            },
          },
        })
        .addSchemaToComponents("UpdateUserVo", {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "是否成功",
              examples: [true],
            },
            data: {
              type: "object",
              description: "返回数据",
              properties: {
                id: {
                  type: "string",
                  format: "uuid",
                  description: "用户ID",
                  examples: ["123e4567-e89b-12d3-a456-426614174000"],
                },
              },
            },
          },
        })
        .addSchemaToComponents("UserNotFoundVo", {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "是否成功",
              examples: [false],
            },
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  description: "错误码",
                  examples: ["USER_NOT_FOUND"],
                },
                message: {
                  type: "string",
                  description: "错误消息",
                  examples: ["指定的用户不存在"],
                },
              },
            },
          },
        });

      const result = await parser.parse(builder);

      expect(result).toMatchSnapshot();
    });

    it("应该解析包含@link引用的Zod schema的JSDoc注释", async () => {
      const project = createProject({
        tsConfigFilePath: "tsconfig.json",
        useInMemoryFileSystem: false,
        skipAddingFilesFromTsConfig: true,
      });
      project.addDirectoryAtPath("tests/fixtures");
      project.createSourceFile(
        "test.ts",
        `
import { UpdateUserDto, UpdateUserVo, UserNotFoundVo } from "@tests/fixtures/schema"
/**
 * @operation put /api/users/{id}
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @operationId updateUser
 * @tags users
 * @deprecated
 * @parameter id path required 用户ID
 * schema:
 *   type: string
 *   format: uuid
 * example: 123e4567-e89b-12d3-a456-426614174000
 * @requestBody {@link UpdateUserDto} required 用户更新数据
 * @response 200 {@link UpdateUserVo} 更新用户信息成功
 * @response 404 {@link UserNotFoundVo} 用户不存在
 */
app.put("/api/users/:id", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result).toMatchSnapshot();
    });
  });

  describe("Express框架集成测试", () => {
    it("应该能够自动分析Express路由", async () => {
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
import { UserVo, UserIdDto, UpdateUserDto, UpdateUserVo, UserNotFoundVo } from "@tests/fixtures/schema"
const app = express()

/**
 * @summary 获取用户信息
 * @description 获取指定用户的个人信息
 * @tags users
 * @response 200 {@link UserVo} 获取用户信息成功
 * @response 404 {@link UserNotFoundVo} 用户不存在
 */
app.get("/api/users/:id", zodValidator({
  params: UserIdDto
}), (req, res) => {})

/**
 * @summary 更新用户信息
 * @description 更新指定用户的个人信息
 * @tags users
 * @response 200 {@link UpdateUserVo} 更新用户信息成功
 * @response 404 {@link UserNotFoundVo} 用户不存在
 */
app.put("/api/users/:id", zodValidator({
  params: UserIdDto,
  body: UpdateUserDto
}), (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result).toMatchSnapshot();
    });
  });

  describe("选项测试", () => {
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
