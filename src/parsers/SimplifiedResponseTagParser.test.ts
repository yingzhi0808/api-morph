import { createJSDocTag, createParseContext } from "@tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { SimplifiedResponseTagParser } from "./SimplifiedResponseTagParser";

describe("SimplifiedResponseTagParser", () => {
  let parser: SimplifiedResponseTagParser;

  beforeEach(() => {
    const context = createParseContext();
    parser = new SimplifiedResponseTagParser(context);
  });

  describe("properties", () => {
    it("应该支持所有 HTTP 状态码的响应标签", () => {
      // 验证包含我们关心的主要标签
      const expectedTags = [
        "okResponse", // 200
        "createdResponse", // 201
        "noContentResponse", // 204
        "badRequestResponse", // 400
        "unauthorizedResponse", // 401
        "forbiddenResponse", // 403
        "notFoundResponse", // 404
        "conflictResponse", // 409
        "internalServerErrorResponse", // 500
      ];

      expectedTags.forEach((tag) => {
        expect(parser.tags).toContain(tag);
      });

      // 验证总标签数量大于我们预期的主要标签（应该包含更多HTTP状态码）
      expect(parser.tags.length).toBeGreaterThan(expectedTags.length);
    });
  });

  describe("状态码映射", () => {
    const testCases = [
      { tag: "@okResponse", expectedStatusCode: "200", expectedDescription: "OK" },
      { tag: "@createdResponse", expectedStatusCode: "201", expectedDescription: "Created" },
      { tag: "@noContentResponse", expectedStatusCode: "204", expectedDescription: "No Content" },
      { tag: "@badRequestResponse", expectedStatusCode: "400", expectedDescription: "Bad Request" },
      {
        tag: "@unauthorizedResponse",
        expectedStatusCode: "401",
        expectedDescription: "Unauthorized",
      },
      { tag: "@forbiddenResponse", expectedStatusCode: "403", expectedDescription: "Forbidden" },
      { tag: "@notFoundResponse", expectedStatusCode: "404", expectedDescription: "Not Found" },
      { tag: "@conflictResponse", expectedStatusCode: "409", expectedDescription: "Conflict" },
      {
        tag: "@internalServerErrorResponse",
        expectedStatusCode: "500",
        expectedDescription: "Internal Server Error",
      },
    ];

    it.each(testCases)(
      "应该正确解析 $tag 标签",
      async ({ tag, expectedStatusCode, expectedDescription }) => {
        const jsDocTag = createJSDocTag(tag);
        const result = await parser.parse(jsDocTag);
        expect(result).toEqual({
          responses: {
            [expectedStatusCode]: {
              content: {
                "application/json": {},
              },
              description: expectedDescription,
            },
          },
        });
      },
    );
  });
});
