import { createFileWithContent, createProject } from "@tests/utils";
import { describe, expect, it } from "vitest";
import { OpenAPIBuilder } from "@/builders";
import { OpenAPIParser } from "./OpenAPIParser";

describe("OpenAPIParser", () => {
  describe("标签解析功能测试", () => {
    it("应该解析包含JSON Schema的JSDoc注释", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "user-controller.ts",
        `
/**
 * @operation put /api/v1/users/{userId}/profile
 * @summary 更新用户档案信息
 * @description 更新指定用户的个人档案信息，包括基本信息和偏好设置。支持部分更新，只更新提供的字段。
 * @operationId updateUserProfile
 * @tags users profile
 * @deprecated
 * @parameter userId path required 用户唯一标识符
 * schema:
 *   type: string
 *   format: uuid
 * example: 123e4567-e89b-12d3-a456-426614174000
 * @requestBody required 用户档案更新数据
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
 * @response 200 用户档案更新成功
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
 *             userId:
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
app.put("/api/v1/users/:userId/profile", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result).toMatchSnapshot();
    });

    it("应该解析包含内联schema的JSDoc注释", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "user-controller.ts",
        `
/**
 * @operation put /api/v1/users/{userId}/profile
 * @summary 更新用户档案信息
 * @description 更新指定用户的个人档案信息，包括基本信息和偏好设置。支持部分更新，只更新提供的字段。
 * @operationId updateUserProfile
 * @tags users profile
 * @deprecated
 * @parameter userId path required 用户唯一标识符
 * schema:
 *   type: string
 *   format: uuid
 * example: 123e4567-e89b-12d3-a456-426614174000
 * @requestBody {$ref: "#/components/schemas/UpdateUserProfileDto"} required 用户档案更新数据
 * @response 200 {$ref: "#/components/schemas/UpdateUserProfileVo"} 用户档案更新成功
 * @response 404 {$ref: "#/components/schemas/UserNotFoundVo"} 用户不存在
 */
app.put("/api/v1/users/:userId/profile", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder()
        .addSchemaToComponents("UpdateUserProfileDto", {
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
        .addSchemaToComponents("UpdateUserProfileVo", {
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
                userId: {
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
      createFileWithContent(
        project,
        "user-controller.ts",
        `
import { UpdateUserProfileDto, UpdateUserProfileVo, UserNotFoundVo } from "@tests/fixtures/schema"
/**
 * @operation put /api/v1/users/{userId}/profile
 * @summary 更新用户档案信息
 * @description 更新指定用户的个人档案信息，包括基本信息和偏好设置。支持部分更新，只更新提供的字段。
 * @operationId updateUserProfile
 * @tags users profile
 * @deprecated
 * @parameter userId path required 用户唯一标识符
 * schema:
 *   type: string
 *   format: uuid
 * example: 123e4567-e89b-12d3-a456-426614174000
 * @requestBody {@link UpdateUserProfileDto} required 用户档案更新数据
 * @response 200 {@link UpdateUserProfileVo} 用户档案更新成功
 * @response 404 {@link UserNotFoundVo} 用户不存在
 */
app.put("/api/v1/users/:userId/profile", (req, res) => {})`,
      );

      const parser = new OpenAPIParser(project);
      const builder = new OpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result).toMatchSnapshot();
    });
  });
});
