import type { JSDocTag } from "ts-morph";
import YAML from "yaml";
import z from "zod/v4";
import { ParameterBuilder } from "@/builders/ParameterBuilder";
import { VALID_PARAMETER_IN, VALID_PARAMETER_STYLE } from "@/constants";
import { getZodErrorMessage } from "@/helpers/zod";
import type { ParameterIn, ParameterStyle } from "@/types/common";
import { JSDocTagName } from "@/types/common";
import type { ParameterObject } from "@/types/openapi";
import type { OperationData } from "@/types/parser";
import { isExtensionKey } from "@/utils/typeGuards";
import type { ParsedTagParams } from "./TagParser";
import { TagParser } from "./TagParser";

/**
 * 参数标签解析器，处理 `@parameter` 标签。
 *
 * @category Parsers
 */
export class ParameterTagParser extends TagParser {
  tags: string[] = [JSDocTagName.PARAMETER];

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  async parse(tag: JSDocTag) {
    const params = await this.parseTagParamsWithYaml(tag);
    const transformedParams = this.transformParams(params);
    const validatedParams = this.validateParams(transformedParams);
    return this.buildParameter(validatedParams);
  }

  /**
   * 转换参数的钩子方法，子类可以重写此方法来完全控制参数转换。
   * @param params 参数对象。
   * @returns 转换后的参数对象。
   */
  protected transformParams(params: ParsedTagParams) {
    const { inline, yaml = {} } = params;

    let required: boolean | undefined;
    let schema: unknown | undefined;

    const parts = [...inline];

    // 前两个参数必须是 name 和 in
    const name = parts.shift();
    const paramIn = parts.shift();

    // 继续查找包含 $ref 的参数作为 schema
    const schemaIndex = parts.findIndex((part) => part.includes("$ref:"));
    if (schemaIndex !== -1) {
      const schemaRef = parts.splice(schemaIndex, 1)[0];
      schema = YAML.parse(schemaRef);
    }

    // 检查是否包含 required 参数
    const requiredIndex = parts.findIndex((part) => part === "required");
    if (requiredIndex !== -1) {
      required = true;
      parts.splice(requiredIndex, 1);
    }

    // 剩余的第一个参数作为描述
    const description = parts[0];

    return {
      name,
      in: paramIn,
      schema,
      required,
      description,
      ...yaml,
    };
  }

  /**
   * 验证参数标签的参数和YAML参数。
   * @param params 参数对象。
   * @returns 验证后的数据对象。
   */
  private validateParams(params: unknown) {
    const message =
      `\n正确格式:\n` +
      `  @${JSDocTagName.PARAMETER} <name> <in> [required] [schema] [description]\n` +
      `  description?: string\n` +
      `  required?: boolean\n` +
      `  deprecated?: boolean\n` +
      `  allowEmptyValue?: boolean\n` +
      `  style?: string\n` +
      `  explode?: boolean\n` +
      `  allowReserved?: boolean\n` +
      `  schema?: SchemaObject | ReferenceObject\n` +
      `  example?: any\n` +
      `  examples?: Record<string, ExampleObject | ReferenceObject>\n` +
      `  content?: Record<string, MediaTypeObject>\n` +
      `  [key: \`x-\${string}\`]: any\n`;

    const schema = z
      .looseObject({
        name: z
          .string(`@${JSDocTagName.PARAMETER} 标签 name 不能为空`)
          .regex(/^[a-zA-Z_][a-zA-Z0-9_.-]*$/, {
            error: (iss) =>
              `@${JSDocTagName.PARAMETER} 标签 name 格式不正确："${iss.input}"，必须是有效的标识符（以字母或下划线开头，只能包含字母、数字、下划线、点和连字符）`,
          }),
        in: z.enum(VALID_PARAMETER_IN as ParameterIn[], {
          error: (iss) =>
            iss.input === undefined
              ? `@${JSDocTagName.PARAMETER} 标签 in 不能为空`
              : `@${JSDocTagName.PARAMETER} 标签 in 值不正确："${iss.input}"，支持的值有：${VALID_PARAMETER_IN.join(", ")}`,
        }),
        description: z.string().optional(),
        required: z.boolean().optional(),
        deprecated: z.boolean().optional(),
        allowEmptyValue: z.boolean().optional(),
        style: z.enum(VALID_PARAMETER_STYLE as ParameterStyle[]).optional(),
        explode: z.boolean().optional(),
        allowReserved: z.boolean().optional(),
        schema: z.any().optional(),
        example: z.any().optional(),
        examples: z.record(z.string(), z.any()).optional(),
        content: z.record(z.string(), z.any()).optional(),
      })
      .check((ctx) => {
        const allKeys = Object.keys(ctx.value);
        const knownKeys = [
          "name",
          "in",
          "description",
          "required",
          "deprecated",
          "allowEmptyValue",
          "style",
          "explode",
          "allowReserved",
          "schema",
          "example",
          "examples",
          "content",
        ];
        const extraKeys = allKeys.filter((key) => !knownKeys.includes(key));
        const invalidKeys = extraKeys.filter((key) => !key.startsWith("x-"));

        if (invalidKeys.length > 0) {
          ctx.issues.push({
            code: "unrecognized_keys",
            input: ctx.value,
            keys: invalidKeys,
          });
        }
      });

    const { success, data, error } = schema.safeParse(params);
    if (!success) {
      throw new Error(getZodErrorMessage(error) + message);
    }
    return data;
  }

  /**
   * 构建参数对象。
   * @param params 参数对象。
   * @returns 构建的参数对象。
   */
  private buildParameter(params: ParameterObject): OperationData {
    const parameterBuilder = new ParameterBuilder(params.name, params.in);

    if (params.description) {
      parameterBuilder.setDescription(params.description);
    }

    if (params.required !== undefined) {
      parameterBuilder.setRequired(params.required);
    }

    if (params.deprecated !== undefined) {
      parameterBuilder.setDeprecated(params.deprecated);
    }

    if (params.allowEmptyValue !== undefined) {
      parameterBuilder.setAllowEmptyValue(params.allowEmptyValue);
    }

    if (params.style) {
      parameterBuilder.setStyle(params.style);
    }

    if (params.explode !== undefined) {
      parameterBuilder.setExplode(params.explode);
    }

    if (params.allowReserved !== undefined) {
      parameterBuilder.setAllowReserved(params.allowReserved);
    }

    if (params.schema) {
      parameterBuilder.setSchema(params.schema);
    }

    if (params.example) {
      parameterBuilder.setExample(params.example);
    }

    if (params.examples) {
      parameterBuilder.setExamples(params.examples);
    }

    if (params.content) {
      Object.entries(params.content).forEach(([mediaType, mediaTypeObject]) => {
        parameterBuilder.addContent(mediaType, mediaTypeObject);
      });
    }

    Object.entries(params).forEach(([key, value]) => {
      if (isExtensionKey(key)) {
        parameterBuilder.addExtension(key, value);
      }
    });

    return {
      parameters: [parameterBuilder.build()],
    };
  }
}
