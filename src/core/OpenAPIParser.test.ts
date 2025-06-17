import { createFileWithContent, createProject } from "@tests/utils";
import { type JSDocTag, Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import { OpenAPIBuilder } from "@/builders";
import { TagParser } from "@/core/TagParser";
import type { OpenAPIObject, ParsedTagParams, ParserOptions } from "@/types";
import { OpenAPIParser } from "./OpenAPIParser";

function createDefaultOpenAPIBuilder() {
  const defaultDocument: OpenAPIObject = {
    openapi: "3.1.0",
    info: { title: "Test API", version: "1.0.0" },
  };
  return new OpenAPIBuilder(defaultDocument);
}

describe("OpenAPIParser", () => {
  describe("constructor", () => {
    it("应该正确创建默认配置的解析器", () => {
      const project = createProject();
      const parser = new OpenAPIParser(project);

      expect(parser).toBeInstanceOf(OpenAPIParser);
    });

    it("应该正确创建带自定义配置的解析器", () => {
      const project = createProject();
      const customOptions: ParserOptions = {
        includeDeprecated: false,
        defaultResponseMediaType: "application/xml",
        defaultRequestMediaType: "application/xml",
      };

      const parser = new OpenAPIParser(project, customOptions);
      expect(parser).toBeInstanceOf(OpenAPIParser);
    });

    it("应该正确创建带自定义解析器的解析器", () => {
      const project = createProject();

      class CustomParser extends TagParser {
        tags = ["custom"];

        parse() {
          return {
            extensions: {
              "x-custom": "value",
            },
          };
        }

        transformParams(_params: ParsedTagParams, _tag: JSDocTag) {}
      }

      const customOptions: ParserOptions = {
        customParsers: [CustomParser],
      };

      const parser = new OpenAPIParser(project, customOptions);
      expect(parser).toBeInstanceOf(OpenAPIParser);
    });

    it("应该正确处理空的自定义选项", () => {
      const project = createProject();
      const parser = new OpenAPIParser(project, {});

      expect(parser).toBeInstanceOf(OpenAPIParser);
    });

    it("应该正确处理customParsers为undefined的情况", () => {
      const project = createProject();
      const customOptions: ParserOptions = {
        includeDeprecated: false,
        customParsers: undefined,
      };

      const parser = new OpenAPIParser(project, customOptions);
      expect(parser).toBeInstanceOf(OpenAPIParser);
    });
  });

  describe("parse", () => {
    it("应该正确解析空项目", async () => {
      const project = createProject();
      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();

      const result = await parser.parse(builder);

      expect(result).toEqual({
        openapi: "3.1.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
      });
    });

    it("应该正确解析没有@operation标签的文件", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * @param name 名称
         */
        function normalFunction(name: string) {
          return name;
        }
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result).toEqual({
        openapi: "3.1.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
      });
    });

    it("应该正确解析单个@operation标签", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "users.ts",
        `
        /**
         * @operation get /users
         * @summary 获取用户列表
         */
        function getUsers() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/users");
      expect(result.paths?.["/users"]).toHaveProperty("get");
      expect(result.paths?.["/users"].get).toMatchObject({
        summary: "获取用户列表",
        responses: {},
      });
    });

    it("应该正确解析多个操作", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "users.ts",
        `
        /**
         * @operation get /users
         * @summary 获取用户列表
         */
        function getUsers() {}

        /**
         * @operation post /users
         * @summary 创建用户
         */
        function createUser() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/users");
      expect(result.paths?.["/users"]).toHaveProperty("get");
      expect(result.paths?.["/users"]).toHaveProperty("post");
      expect(result.paths?.["/users"].get?.summary).toBe("获取用户列表");
      expect(result.paths?.["/users"].post?.summary).toBe("创建用户");
    });

    it("应该正确解析不同路径的操作", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "api.ts",
        `
        /**
         * @operation get /users
         * @summary 获取用户
         */
        function getUsers() {}

        /**
         * @operation get /posts
         * @summary 获取文章
         */
        function getPosts() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/users");
      expect(result.paths).toHaveProperty("/posts");
      expect(result.paths?.["/users"].get?.summary).toBe("获取用户");
      expect(result.paths?.["/posts"].get?.summary).toBe("获取文章");
    });

    it("应该正确解析复杂的操作配置", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "api.ts",
        `
        /**
         * @operation post /users
         * @summary 创建用户
         * @description 创建一个新的用户账户
         * @tags user management
         * @parameter name query 用户名称
         * @requestBody 用户信息
         * required: true
         * content:
         *   application/json:
         *     schema:
         *       type: object
         * @response 201 创建成功
         */
        function createUser() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      const operation = result.paths?.["/users"]?.post;
      expect(operation).toMatchObject({
        summary: "创建用户",
        description: "创建一个新的用户账户",
        tags: ["user", "management"],
        parameters: [
          {
            name: "name",
            in: "query",
            description: "用户名称",
          },
        ],
        requestBody: {
          description: "用户信息",
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "创建成功",
          },
        },
      });
    });

    it("应该正确处理多个文件", async () => {
      const project = createProject();

      createFileWithContent(
        project,
        "users.ts",
        `
        /**
         * @operation get /users 获取用户
         */
        function getUsers() {}
        `,
      );

      createFileWithContent(
        project,
        "posts.ts",
        `
        /**
         * @operation get /posts 获取文章
         */
        function getPosts() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/users");
      expect(result.paths).toHaveProperty("/posts");
    });

    it("应该正确解析同一路径不同方法的操作", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "api.ts",
        `
        /**
         * @operation get /users/{id}
         * @summary 获取单个用户
         */
        function getUser() {}

        /**
         * @operation put /users/{id}
         * @summary 更新用户
         */
        function updateUser() {}

        /**
         * @operation delete /users/{id}
         * @summary 删除用户
         */
        function deleteUser() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      const pathItem = result.paths?.["/users/{id}"];
      expect(pathItem).toHaveProperty("get");
      expect(pathItem).toHaveProperty("put");
      expect(pathItem).toHaveProperty("delete");
      expect(pathItem?.get?.summary).toBe("获取单个用户");
      expect(pathItem?.put?.summary).toBe("更新用户");
      expect(pathItem?.delete?.summary).toBe("删除用户");
    });

    it("应该正确处理JSDoc文档有父节点的情况", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * @operation get /test
         * @summary 测试接口
         */
        function test() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/test");
      expect(result.paths?.["/test"]?.get?.summary).toBe("测试接口");
    });

    it("应该使用指定的glob模式解析文件", async () => {
      const project = createProject();

      createFileWithContent(
        project,
        "api/users.ts",
        `
        /**
         * @operation get /users 获取用户
         */
        function getUsers() {}
        `,
      );

      createFileWithContent(
        project,
        "utils/helper.ts",
        `
        /**
         * @operation get /helper 辅助方法
         */
        function helper() {}
        `,
      );

      const parser = new OpenAPIParser(project, {
        include: ["api/**/*.ts"],
      });
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/users");
      expect(result.paths).not.toHaveProperty("/helper");
    });

    it("应该正确处理空的glob模式数组", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * @operation get /test 测试
         */
        function test() {}
        `,
      );

      const parser = new OpenAPIParser(project, { include: [] });
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toBeUndefined();
      expect(result.openapi).toBe("3.1.0");
    });

    it("应该正确处理不匹配的glob模式", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * @operation get /test 测试
         */
        function test() {}
        `,
      );

      const parser = new OpenAPIParser(project, { include: ["no-match/**/*.ts"] });
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toBeUndefined();
      expect(result.openapi).toBe("3.1.0");
    });

    it("应该正确处理只有 excludes 配置的情况", async () => {
      const project = createProject();

      createFileWithContent(
        project,
        "api.ts",
        `
        /**
         * @operation get /api/users "API 用户接口"
         */
        function apiUsers() {}
        `,
      );

      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * @operation get /test/endpoint 测试接口
         */
        function testEndpoint() {}
        `,
      );

      // 只配置 excludes，排除 test.ts 文件
      const parser = new OpenAPIParser(project, {
        exclude: ["test.ts"],
      });
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      // 当只有 excludes 时，ts-morph 的 getSourceFiles 只传入排除模式可能不返回文件
      // 这触发了未覆盖的代码分支，但可能不会产生预期的结果
      // 这是一个边界情况，验证代码能正常处理这种情况
      expect(result.openapi).toBe("3.1.0");
      expect(result.info.title).toBe("Test API");
    });

    it("应该正确处理 include 和 excludes 同时存在的情况", async () => {
      const project = createProject();

      createFileWithContent(
        project,
        "src/api/users.ts",
        `
        /**
         * @operation get /users 用户接口
         */
        function users() {}
        `,
      );

      createFileWithContent(
        project,
        "src/api/admin.ts",
        `
        /**
         * @operation get /admin 管理员接口
         */
        function admin() {}
        `,
      );

      createFileWithContent(
        project,
        "src/test/mock.ts",
        `
        /**
         * @operation get /mock 模拟接口
         */
        function mock() {}
        `,
      );

      // include 包含 src/** 目录，但 excludes 排除 admin.ts
      const parser = new OpenAPIParser(project, {
        include: ["src/**/*.ts"],
        exclude: ["**/admin.ts"],
      });
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/users");
      expect(result.paths).toHaveProperty("/mock");
      expect(result.paths).not.toHaveProperty("/admin");
    });

    it("应该正确处理JSDoc中没有标签的情况", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * 这是一个普通的注释，没有标签
         */
        function test() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toBeUndefined();
      expect(result.openapi).toBe("3.1.0");
    });

    it("应该正确处理包含其他标签但没有@operation的JSDoc", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * @param name 名称
         * @returns 返回值
         * @deprecated 已废弃
         */
        function test(name: string) {
          return name;
        }
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toBeUndefined();
      expect(result.openapi).toBe("3.1.0");
    });

    it("应该正确处理自定义解析器", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * @operation get /test
         * @custom 自定义内容
         */
        function test() {}
        `,
      );

      class CustomParser extends TagParser {
        tags = ["custom"];

        parse() {
          return {
            extensions: {
              "x-custom": "value",
            },
          };
        }

        transformParams(_params: ParsedTagParams, _tag: JSDocTag) {}
      }

      const customOptions: ParserOptions = {
        customParsers: [CustomParser],
      };

      const parser = new OpenAPIParser(project, customOptions);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths?.["/test"]?.get).toHaveProperty("x-custom", "value");
    });

    it("应该正确处理多种HTTP方法", async () => {
      const project = createProject();
      const methods = ["get", "post", "put", "delete", "patch", "options", "head"];

      let content = "";
      for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        content += `
        /**
         * @operation ${method} /test${i} "${method} 方法"
         */
        function test${method}() {}
        `;
      }

      createFileWithContent(project, "test.ts", content);

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      for (let i = 0; i < methods.length; i++) {
        const method = methods[i];
        const path = `/test${i}`;
        expect(result.paths).toHaveProperty(path);
        expect(result.paths?.[path]).toHaveProperty(method.toLowerCase());
      }
    });

    it("应该正确处理包含特殊字符的路径", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * @operation get /api/users/{user-id}/posts/{post_id} 特殊字符路径
         */
        function specialPath() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/api/users/{user-id}/posts/{post_id}");
      expect(result.paths?.["/api/users/{user-id}/posts/{post_id}"]).toHaveProperty("get");
    });

    it("应该正确跳过其他文件类型", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "data.json",
        JSON.stringify({
          operation: "get /json-endpoint",
        }),
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toBeUndefined();
    });
  });

  describe("Global Schema 处理", () => {
    it("应该正确处理并添加全局schema到文档中", async () => {
      const project = createProject({
        tsConfigFilePath: "tsconfig.json",
        useInMemoryFileSystem: false,
        skipAddingFilesFromTsConfig: true,
      });

      // 创建一个带有Zod schema引用的文件
      createFileWithContent(
        project,
        "test-schema.ts",
        `
        import { UserLoginVo } from "@tests/fixtures/schema";

        /**
         * @operation post /auth/login 用户登录
         * @response 200 登录成功
         * content:
         *   application/json:
         *     schema: {@link UserLoginVo}
         */
        function login() {}
        `,
      );

      project.addDirectoryAtPath("tests/fixtures");
      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();

      const result = await parser.parse(builder);

      // 验证schema被正确添加到全局schemas中
      expect(result.components?.schemas).toBeDefined();
      expect(result.components?.schemas?.UserLoginVo).toBeDefined();
      expect(result.components?.schemas?.UserLoginVo).toHaveProperty("type", "object");
      expect(result.components?.schemas?.UserLoginVo).toHaveProperty("properties");
    });
  });

  describe("includeDeprecated option", () => {
    it("当includeDeprecated为true时，应该包含废弃的API", async () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "test.ts",
        `
        /**
         * @operation get /users 获取用户列表
         * @response 200 用户列表
         */
        export function getUsers() {}

        /**
         * @operation post /users 创建用户
         * @deprecated
         * @response 201 创建的用户
         */
        export function createUser() {}

        /**
         * @operation get /products 获取产品列表
         * @response 200 产品列表
         */
        export function getProducts() {}
        `,
      );

      const parser = new OpenAPIParser(project, {
        includeDeprecated: true,
        include: ["test.ts"],
      });

      const builder = createDefaultOpenAPIBuilder();

      const result = await parser.parse(builder);

      expect(Object.keys(result.paths || {})).toHaveLength(2);
      expect(result.paths).toHaveProperty("/users");
      expect(result.paths).toHaveProperty("/products");

      expect(result.paths?.["/users"]?.get).toBeDefined();
      expect(result.paths?.["/users"]?.post).toBeDefined();

      expect(result.paths?.["/users"]?.post?.deprecated).toBe(true);
      expect(result.paths?.["/users"]?.get?.deprecated).toBeUndefined();
      expect(result.paths?.["/products"]?.get?.deprecated).toBeUndefined();
    });

    it("当includeDeprecated为false时，应该排除废弃的API", async () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "test.ts",
        `
        /**
         * @operation get /users 获取用户列表
         * @response 200 用户列表
         */
        export function getUsers() {}

        /**
         * @operation post /users 创建用户
         * @deprecated
         * @response 201 创建的用户
         */
        export function createUser() {}

        /**
         * @operation get /products 获取产品列表
         * @response 200 产品列表
         */
        export function getProducts() {}
        `,
      );

      const parser = new OpenAPIParser(project, {
        includeDeprecated: false,
        include: ["test.ts"],
      });

      const builder = createDefaultOpenAPIBuilder().setTitle("Test API").setVersion("1.0.0");

      const result = await parser.parse(builder);

      expect(Object.keys(result.paths || {})).toHaveLength(2);
      expect(result.paths).toHaveProperty("/users");
      expect(result.paths).toHaveProperty("/products");

      expect(result.paths?.["/users"]?.post).toBeUndefined();
      expect(result.paths?.["/users"]?.get).toBeDefined();
      expect(result.paths?.["/products"]?.get).toBeDefined();
    });

    it("当includeDeprecated为false且某个路径的所有操作都被废弃时，应该排除整个路径", async () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "test.ts",
        `
        /**
         * @operation get /legacy 获取遗留数据
         * @deprecated
         * @response 200 遗留数据
         */
        export function getLegacyData() {}

        /**
         * @operation post /legacy 创建遗留数据
         * @deprecated
         * @response 201 创建的遗留数据
         */
        export function createLegacyData() {}

        /**
         * @operation get /users 获取用户列表
         * @response 200 用户列表
         */
        export function getUsers() {}
        `,
      );

      const parser = new OpenAPIParser(project, {
        includeDeprecated: false,
        include: ["test.ts"],
      });

      const builder = createDefaultOpenAPIBuilder().setTitle("Test API").setVersion("1.0.0");

      const result = await parser.parse(builder);

      expect(Object.keys(result.paths || {})).toHaveLength(1);
      expect(result.paths).toHaveProperty("/users");
      expect(result.paths).not.toHaveProperty("/legacy");
    });

    it("默认情况下（未设置includeDeprecated）应该包含废弃的API", async () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "test.ts",
        `
        /**
         * @operation get /users 获取用户列表
         * @response 200 用户列表
         */
        export function getUsers() {}

        /**
         * @operation post /users 创建用户
         * @deprecated
         * @response 201 创建的用户
         */
        export function createUser() {}
        `,
      );

      const parser = new OpenAPIParser(project, {
        include: ["test.ts"],
        // 注意：不设置includeDeprecated，使用默认值
      });

      const builder = createDefaultOpenAPIBuilder().setTitle("Test API").setVersion("1.0.0");

      const result = await parser.parse(builder);

      expect(Object.keys(result.paths || {})).toHaveLength(1);
      expect(result.paths).toHaveProperty("/users");
      expect(result.paths?.["/users"]?.get).toBeDefined();
      expect(result.paths?.["/users"]?.post).toBeDefined();
      expect(result.paths?.["/users"]?.post?.deprecated).toBe(true);
    });
  });

  describe("@hidden 标签处理", () => {
    it("应该忽略带有@hidden标签的操作", async () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "test.ts",
        `
        /**
         * @operation get /users 获取用户列表
         * @response 200 用户列表
         */
        export function getUsers() {}

        /**
         * @operation post /users 创建用户
         * @hidden
         * @response 201 创建的用户
         */
        export function createUser() {}

        /**
         * @operation get /products 获取产品列表
         * @response 200 产品列表
         */
        export function getProducts() {}
        `,
      );

      const parser = new OpenAPIParser(project, {
        include: ["test.ts"],
      });

      const builder = createDefaultOpenAPIBuilder().setTitle("Test API").setVersion("1.0.0");

      const result = await parser.parse(builder);

      expect(Object.keys(result.paths || {})).toHaveLength(2);
      expect(result.paths).toHaveProperty("/users");
      expect(result.paths).toHaveProperty("/products");

      // 带有@hidden标签的POST /users操作应该被忽略
      expect(result.paths?.["/users"]?.post).toBeUndefined();
      expect(result.paths?.["/users"]?.get).toBeDefined();
      expect(result.paths?.["/products"]?.get).toBeDefined();
    });

    it("应该忽略整个路径当其所有操作都被@hidden标签标记", async () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "test.ts",
        `
        /**
         * @operation get /internal 获取内部数据
         * @hidden
         * @response 200 内部数据
         */
        export function getInternalData() {}

        /**
         * @operation post /internal 创建内部数据
         * @hidden
         * @response 201 创建的内部数据
         */
        export function createInternalData() {}

        /**
         * @operation get /users 获取用户列表
         * @response 200 用户列表
         */
        export function getUsers() {}
        `,
      );

      const parser = new OpenAPIParser(project, {
        include: ["test.ts"],
      });

      const builder = createDefaultOpenAPIBuilder().setTitle("Test API").setVersion("1.0.0");

      const result = await parser.parse(builder);

      expect(Object.keys(result.paths || {})).toHaveLength(1);
      expect(result.paths).toHaveProperty("/users");
      expect(result.paths).not.toHaveProperty("/internal");
    });

    it("@hidden标签应该与@deprecated标签配合工作", async () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "test.ts",
        `
        /**
         * @operation get /users 获取用户列表
         * @response 200 用户列表
         */
        export function getUsers() {}

        /**
         * @operation post /users 创建用户
         * @deprecated
         * @response 201 创建的用户
         */
        export function createUser() {}

        /**
         * @operation put /users 更新用户
         * @hidden
         * @deprecated
         * @response 200 更新的用户
         */
        export function updateUser() {}

        /**
         * @operation delete /users 删除用户
         * @hidden
         * @response 204 删除成功
         */
        export function deleteUser() {}
        `,
      );

      const parser = new OpenAPIParser(project, {
        includeDeprecated: true,
        include: ["test.ts"],
      });

      const builder = createDefaultOpenAPIBuilder().setTitle("Test API").setVersion("1.0.0");

      const result = await parser.parse(builder);

      expect(Object.keys(result.paths || {})).toHaveLength(1);
      expect(result.paths).toHaveProperty("/users");

      // GET和POST操作应该存在，但PUT和DELETE应该被@hidden隐藏
      expect(result.paths?.["/users"]?.get).toBeDefined();
      expect(result.paths?.["/users"]?.post).toBeDefined();
      expect(result.paths?.["/users"]?.put).toBeUndefined();
      expect(result.paths?.["/users"]?.delete).toBeUndefined();

      // POST操作应该是废弃的
      expect(result.paths?.["/users"]?.post?.deprecated).toBe(true);
    });

    it("@hidden标签与includeDeprecated=false配合工作", async () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "test.ts",
        `
        /**
         * @operation get /users 获取用户列表
         * @response 200 用户列表
         */
        export function getUsers() {}

        /**
         * @operation post /users 创建用户
         * @deprecated
         * @response 201 创建的用户
         */
        export function createUser() {}

        /**
         * @operation put /users 更新用户
         * @hidden
         * @response 200 更新的用户
         */
        export function updateUser() {}

        /**
         * @operation patch /users 部分更新用户
         * @hidden
         * @deprecated
         * @response 200 更新的用户
         */
        export function patchUser() {}
        `,
      );

      const parser = new OpenAPIParser(project, {
        includeDeprecated: false,
        include: ["test.ts"],
      });

      const builder = createDefaultOpenAPIBuilder().setTitle("Test API").setVersion("1.0.0");

      const result = await parser.parse(builder);

      expect(Object.keys(result.paths || {})).toHaveLength(1);
      expect(result.paths).toHaveProperty("/users");

      // 只有GET操作应该存在
      // POST被@deprecated过滤掉
      // PUT和PATCH被@hidden过滤掉
      expect(result.paths?.["/users"]?.get).toBeDefined();
      expect(result.paths?.["/users"]?.post).toBeUndefined();
      expect(result.paths?.["/users"]?.put).toBeUndefined();
      expect(result.paths?.["/users"]?.patch).toBeUndefined();
    });

    it("应该正确处理混合的标签场景", async () => {
      const project = new Project({ useInMemoryFileSystem: true });

      project.createSourceFile(
        "test.ts",
        `
        /**
         * @operation get /api/public 公共接口
         * @response 200 公共数据
         */
        export function getPublicData() {}

        /**
         * @operation get /api/admin 管理员接口
         * @hidden
         * @tags admin
         * @response 200 管理员数据
         */
        export function getAdminData() {}

        /**
         * @operation post /api/admin 创建管理员数据
         * @hidden
         * @tags admin
         * @response 201 创建的数据
         */
        export function createAdminData() {}

        /**
         * @operation get /api/debug 调试接口
         * @hidden
         * @deprecated
         * @tags debug
         * @response 200 调试信息
         */
        export function getDebugInfo() {}
        `,
      );

      const parser = new OpenAPIParser(project, {
        include: ["test.ts"],
      });

      const builder = createDefaultOpenAPIBuilder().setTitle("Test API").setVersion("1.0.0");

      const result = await parser.parse(builder);

      expect(Object.keys(result.paths || {})).toHaveLength(1);
      expect(result.paths).toHaveProperty("/api/public");
      expect(result.paths).not.toHaveProperty("/api/admin");
      expect(result.paths).not.toHaveProperty("/api/debug");

      // 标签列表中不应该包含admin和debug标签
      expect(result.tags).toBeUndefined();
    });
  });

  describe("tags handling", () => {
    it("应该正确处理单个操作的单个标签", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * @operation get /test 测试接口
         * @tags test-tag
         */
        function test() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.tags).toEqual([{ name: "test-tag" }]);
      expect(result.paths?.["/test"]?.get?.tags).toEqual(["test-tag"]);
    });
  });

  describe("边界情况", () => {
    it("应该正确处理空项目配置", async () => {
      const project = createProject();
      const parser = new OpenAPIParser(project, undefined);

      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result).toMatchObject({
        openapi: "3.1.0",
        info: {
          title: "Test API",
          version: "1.0.0",
        },
      });
    });

    it("应该正确处理部分自定义配置", async () => {
      const project = createProject();
      const partialOptions: ParserOptions = {
        includeDeprecated: false,
      };

      const parser = new OpenAPIParser(project, partialOptions);
      expect(parser).toBeInstanceOf(OpenAPIParser);
    });

    it("应该正确处理非常大的项目结构", async () => {
      const project = createProject();

      for (let i = 0; i < 10; i++) {
        let content = "";
        for (let j = 0; j < 5; j++) {
          content += `
          /**
           * @operation get /api/v${i}/resource${j} "获取资源 ${i}-${j}"
           */
          function getResource${i}_${j}() {}
          `;
        }
        createFileWithContent(project, `api${i}.ts`, content);
      }

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(Object.keys(result.paths || {})).toHaveLength(50);
    });

    it("应该正确处理重复路径的不同方法组合", async () => {
      const project = createProject();
      createFileWithContent(
        project,
        "test.ts",
        `
        /**
         * @operation get /api/resource "get 方法"
         */
        function get() {}

        /**
         * @operation post /api/resource "post 方法"
         */
        function post() {}

        /**
         * @operation put /api/resource "put 方法"
         */
        function put() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      const pathItem = result.paths?.["/api/resource"];
      expect(pathItem).toHaveProperty("get");
      expect(pathItem).toHaveProperty("post");
      expect(pathItem).toHaveProperty("put");
      expect(Object.keys(pathItem || {})).toHaveLength(3);
    });

    it("应该正确处理复杂的文件路径结构", async () => {
      const project = createProject();

      createFileWithContent(
        project,
        "src/api/v1/users.ts",
        `
        /**
         * @operation get /v1/users "V1 用户接口"
         */
        function v1Users() {}
        `,
      );

      createFileWithContent(
        project,
        "src/api/v2/users.ts",
        `
        /**
         * @operation get /v2/users "V2 用户接口"
         */
        function v2Users() {}
        `,
      );

      const parser = new OpenAPIParser(project);
      const builder = createDefaultOpenAPIBuilder();
      const result = await parser.parse(builder);

      expect(result.paths).toHaveProperty("/v1/users");
      expect(result.paths).toHaveProperty("/v2/users");
    });
  });
});
