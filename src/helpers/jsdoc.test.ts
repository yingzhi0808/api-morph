import { Project, SyntaxKind } from "ts-morph";
import { describe, expect, it } from "vitest";
import { findSchemaJSDocLinks } from "./jsdoc";

describe("findSchemaJSDocLinks", () => {
  it("应该正确识别位于schema:后面的JSDocLink节点", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      const UserLoginVo = "test";

      /**
       * @response 200 用户登录
       * content:
       *   application/json:
       *     schema: {@link UserLoginVo}
       */
      function testFunction() {}
      `,
    );

    const jsDoc = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc)[0];
    const responseTag = jsDoc.getTags().find((tag) => tag.getTagName() === "response");

    expect(responseTag).toBeDefined();

    const schemaLinks = findSchemaJSDocLinks(responseTag!);

    expect(schemaLinks).toHaveLength(1);
    expect(schemaLinks[0].getText()).toBe("{@link UserLoginVo}");
  });

  it("应该识别多个schema:后面的JSDocLink节点", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      const UserLoginVo = "test";
      const UserInfo = "test2";

      /**
       * @response 200 获取用户信息
       * content:
       *   application/json:
       *     schema: {@link UserInfo}
       * headers:
       *   x-user-id:
       *     description: "用户ID"
       *     schema: {@link UserLoginVo}
       */
      function testFunction() {}
      `,
    );

    const jsDoc = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc)[0];
    const responseTag = jsDoc.getTags().find((tag) => tag.getTagName() === "response");

    expect(responseTag).toBeDefined();

    const schemaLinks = findSchemaJSDocLinks(responseTag!);

    expect(schemaLinks).toHaveLength(2);
    expect(schemaLinks[0].getText()).toBe("{@link UserInfo}");
    expect(schemaLinks[1].getText()).toBe("{@link UserLoginVo}");
  });

  it("应该识别内联参数中的JSDocLink节点", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      const UserLoginVo = "test";
      const OtherType = "test2";

      /**
       * @response 200 用户登录，参考 {@link OtherType}
       * content:
       *   application/json:
       *     schema: {@link UserLoginVo}
       */
      function testFunction() {}
      `,
    );

    const jsDoc = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc)[0];
    const responseTag = jsDoc.getTags().find((tag) => tag.getTagName() === "response");

    expect(responseTag).toBeDefined();

    const schemaLinks = findSchemaJSDocLinks(responseTag!);

    expect(schemaLinks).toHaveLength(2);
    expect(schemaLinks[0].getText()).toBe("{@link OtherType}");
    expect(schemaLinks[1].getText()).toBe("{@link UserLoginVo}");
  });

  it("应该处理没有JSDocLink的情况", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      /**
       * @response 200 用户登录
       * content:
       *   application/json:
       *     schema:
       *       type: object
       */
      function testFunction() {}
      `,
    );

    const jsDoc = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc)[0];
    const responseTag = jsDoc.getTags().find((tag) => tag.getTagName() === "response");

    expect(responseTag).toBeDefined();

    const schemaLinks = findSchemaJSDocLinks(responseTag!);

    expect(schemaLinks).toHaveLength(0);
  });

  it("应该处理没有comment的情况", () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(
      "test.ts",
      `
      /**
       * @response
       */
      function testFunction() {}
      `,
    );

    const jsDoc = sourceFile.getDescendantsOfKind(SyntaxKind.JSDoc)[0];
    const responseTag = jsDoc.getTags().find((tag) => tag.getTagName() === "response");

    expect(responseTag).toBeDefined();

    const schemaLinks = findSchemaJSDocLinks(responseTag!);

    expect(schemaLinks).toHaveLength(0);
  });
});
