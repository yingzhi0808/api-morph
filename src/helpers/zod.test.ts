import { Project, SyntaxKind } from "ts-morph";
import { describe, expect, it } from "vitest";
import { type ZodError, z } from "zod/v4";
import { getZodErrorMessage, isZodType } from "./zod";

describe("zod helpers", () => {
  describe("isZodType", () => {
    const project = new Project();

    it("应该正确识别ZodString类型", () => {
      const sourceFile = project.createSourceFile(
        "test1.ts",
        `
        import z from "zod/v4";
        const stringSchema = z.string();
        `,
      );

      const variableDeclaration = sourceFile
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((decl) => decl.getName() === "stringSchema");

      expect(variableDeclaration).toBeDefined();
      expect(isZodType(variableDeclaration!)).toBe(true);
    });

    it("应该正确识别ZodNumber类型", () => {
      const sourceFile = project.createSourceFile(
        "test2.ts",
        `
        import z from "zod/v4";
        const numberSchema = z.number();
        `,
      );

      const variableDeclaration = sourceFile
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((decl) => decl.getName() === "numberSchema");

      expect(variableDeclaration).toBeDefined();
      expect(isZodType(variableDeclaration!)).toBe(true);
    });

    it("应该正确识别ZodObject类型", () => {
      const sourceFile = project.createSourceFile(
        "test3.ts",
        `
        import z from "zod/v4";
        const objectSchema = z.object({
          name: z.string(),
          age: z.number()
        });
        `,
      );

      const variableDeclaration = sourceFile
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((decl) => decl.getName() === "objectSchema");

      expect(variableDeclaration).toBeDefined();
      expect(isZodType(variableDeclaration!)).toBe(true);
    });

    it("应该正确识别ZodArray类型", () => {
      const sourceFile = project.createSourceFile(
        "test4.ts",
        `
        import z from "zod/v4";
        const arraySchema = z.array(z.string());
        `,
      );

      const variableDeclaration = sourceFile
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((decl) => decl.getName() === "arraySchema");

      expect(variableDeclaration).toBeDefined();
      expect(isZodType(variableDeclaration!)).toBe(true);
    });

    it("应该正确识别ZodUnion类型", () => {
      const sourceFile = project.createSourceFile(
        "test5.ts",
        `
        import z from "zod/v4";
        const unionSchema = z.union([z.string(), z.number()]);
        `,
      );

      const variableDeclaration = sourceFile
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((decl) => decl.getName() === "unionSchema");

      expect(variableDeclaration).toBeDefined();
      expect(isZodType(variableDeclaration!)).toBe(true);
    });

    it("应该正确识别ZodOptional类型", () => {
      const sourceFile = project.createSourceFile(
        "test6.ts",
        `
        import z from "zod/v4";
        const optionalSchema = z.string().optional();
        `,
      );

      const variableDeclaration = sourceFile
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((decl) => decl.getName() === "optionalSchema");

      expect(variableDeclaration).toBeDefined();
      expect(isZodType(variableDeclaration!)).toBe(true);
    });

    it("应该正确识别复杂的嵌套Zod类型", () => {
      const sourceFile = project.createSourceFile(
        "test7.ts",
        `
        import z from "zod/v4";
        const complexSchema = z.object({
          user: z.object({
            name: z.string(),
            email: z.string().email()
          }),
          tags: z.array(z.string()),
          metadata: z.record(z.any()).optional()
        });
        `,
      );

      const variableDeclaration = sourceFile
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((decl) => decl.getName() === "complexSchema");

      expect(variableDeclaration).toBeDefined();
      expect(isZodType(variableDeclaration!)).toBe(true);
    });

    it("应该正确拒绝非Zod类型", () => {
      const sourceFile = project.createSourceFile(
        "test8.ts",
        `
        const regularString = "hello";
        `,
      );

      const stringDeclaration = sourceFile
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((decl) => decl.getName() === "regularString");

      expect(stringDeclaration).toBeDefined();
      expect(isZodType(stringDeclaration!)).toBe(false);
    });
  });

  describe("getZodErrorMessage", () => {
    it("应该正确获取表单错误信息", () => {
      const schema = z.string().min(5, "字符串长度至少为5");

      try {
        schema.parse("abc");
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(message).toBe("字符串长度至少为5");
      }
    });

    it("应该正确获取字段错误信息", () => {
      const schema = z.object({
        name: z.string().min(2, "姓名至少2个字符"),
        email: z.email("邮箱格式不正确"),
        age: z.number().min(18, "年龄至少18岁"),
      });

      try {
        schema.parse({
          name: "a",
          email: "invalid-email",
          age: 16,
        });
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
        expect(["姓名至少2个字符", "邮箱格式不正确", "年龄至少18岁"]).toContain(message);
      }
    });

    it("应该正确处理嵌套对象的错误信息", () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(2, "用户名至少2个字符"),
          }),
        }),
      });

      try {
        schema.parse({
          user: {
            profile: {
              name: "a",
            },
          },
        });
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(message).toBe("用户名至少2个字符");
      }
    });

    it("应该正确处理数组错误信息", () => {
      const schema = z.array(z.string().min(3, "数组元素至少3个字符"));

      try {
        schema.parse(["ab", "cd"]);
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(message).toBe("数组元素至少3个字符");
      }
    });

    it("应该正确处理联合类型错误信息", () => {
      const schema = z.union([
        z.string().min(5, "字符串至少5个字符"),
        z.number().min(10, "数字至少为10"),
      ]);

      try {
        schema.parse("abc");
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
      }
    });

    it("应该正确处理复杂验证错误", () => {
      const schema = z
        .object({
          email: z.email("邮箱格式不正确"),
          password: z.string().min(8, "密码至少8位").regex(/[A-Z]/, "密码必须包含大写字母"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "两次密码输入不一致",
          path: ["confirmPassword"],
        });

      try {
        schema.parse({
          email: "invalid-email",
          password: "weak",
          confirmPassword: "different",
        });
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
      }
    });

    it("应该正确处理自定义错误信息", () => {
      const schema = z.string().refine((val) => val.includes("@"), {
        message: "必须包含@符号",
      });

      try {
        schema.parse("invalid");
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(message).toBe("必须包含@符号");
      }
    });

    it("应该正确处理多个字段错误时返回第一个", () => {
      const schema = z.object({
        field1: z.string().min(5, "字段1错误"),
        field2: z.string().min(5, "字段2错误"),
        field3: z.string().min(5, "字段3错误"),
      });

      try {
        schema.parse({
          field1: "a",
          field2: "b",
          field3: "c",
        });
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
        expect(["字段1错误", "字段2错误", "字段3错误"]).toContain(message);
      }
    });

    it("应该正确处理没有自定义错误信息的情况", () => {
      const schema = z.string().min(5);

      try {
        schema.parse("abc");
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it("应该正确处理空的错误对象", () => {
      const emptyError = new z.ZodError([]);
      const message = getZodErrorMessage(emptyError);
      expect(message).toBeUndefined();
    });

    it("应该正确处理ZodBoolean类型", () => {
      const schema = z.boolean();

      try {
        schema.parse("not-boolean");
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
      }
    });

    it("应该正确处理ZodDate类型", () => {
      const schema = z.date();

      try {
        schema.parse("not-date");
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
      }
    });

    it("应该正确处理ZodEnum类型", () => {
      const schema = z.enum(["red", "green", "blue"]);

      try {
        schema.parse("yellow");
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
      }
    });

    it("应该正确处理ZodLiteral类型", () => {
      const schema = z.literal("exact-value");

      try {
        schema.parse("different-value");
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
      }
    });

    it("应该正确处理ZodTuple类型", () => {
      const schema = z.tuple([z.string(), z.number()]);

      try {
        schema.parse(["string", "not-number"]);
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
      }
    });

    it("应该正确处理ZodRecord类型", () => {
      const schema = z.record(z.string(), z.number());

      try {
        schema.parse({ key: "not-number" });
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
      }
    });

    it("应该正确处理ZodMap类型", () => {
      const schema = z.map(z.string(), z.number());

      try {
        const invalidMap = new Map([["key", "not-number"]]);
        schema.parse(invalidMap);
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
      }
    });

    it("应该正确处理ZodSet类型", () => {
      const schema = z.set(z.number());

      try {
        const invalidSet = new Set(["not-number"]);
        schema.parse(invalidSet);
      } catch (error) {
        const message = getZodErrorMessage(error as ZodError);
        expect(typeof message).toBe("string");
        expect(message).toBeTruthy();
      }
    });
  });
});
