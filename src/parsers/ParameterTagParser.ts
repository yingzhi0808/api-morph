import type { JSDocTag } from "ts-morph";
import z from "zod/v4";
import { ParameterBuilder } from "@/builders";
import { JSDocTagName, VALID_PARAMETER_IN } from "@/constants";
import { TagParser } from "@/core/TagParser";
import { getZodErrorMessage } from "@/helpers";
import type { OperationData, ParameterTagData, ParameterTagParams, ParsedTagParams } from "@/types";
import { isExtensionKey } from "@/utils";

/**
 * 参数标签解析器，处理 `@parameter` 标签
 */
export class ParameterTagParser extends TagParser {
  tags = [JSDocTagName.PARAMETER];

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
  protected transformParams(params: ParsedTagParams): Partial<ParameterTagParams> {
    const { inline, yaml } = params;
    const [name, paramIn, description] = inline;
    return { name, paramIn, description, yaml };
  }

  /**
   * 验证参数标签的参数和YAML参数。
   * @param params 参数对象。
   * @returns 验证后的数据对象。
   */
  protected validateParams(params: unknown) {
    const message =
      `\n正确格式:\n` +
      `  @${JSDocTagName.PARAMETER} <name> <in> [description]\n` +
      `  description?: string\n` +
      `  required?: boolean\n` +
      `  deprecated?: boolean\n` +
      `  allowEmptyValue?: boolean\n` +
      `  style?: string\n` +
      `  explode?: boolean\n` +
      `  allowReserved?: boolean\n` +
      `  schema?: SchemaObject | ReferenceObject\n` +
      `  content?: Record<string, MediaTypeObject>\n` +
      `  [key: \`x-\${string}\`]: any\n`;

    // @ts-ignore
    const schema: z.ZodType<ParameterTagData> = z.object({
      name: z
        .string(`@${JSDocTagName.PARAMETER} 标签 name 不能为空`)
        .regex(/^[a-zA-Z_][a-zA-Z0-9_.-]*$/, {
          error: (iss) =>
            `@${JSDocTagName.PARAMETER} 标签 name 格式不正确："${iss.input}"，必须是有效的标识符（以字母或下划线开头，只能包含字母、数字、下划线、点和连字符）`,
        }),
      paramIn: z.enum(VALID_PARAMETER_IN, {
        error: (iss) =>
          iss.input === undefined
            ? `@${JSDocTagName.PARAMETER} 标签 in 不能为空`
            : `@${JSDocTagName.PARAMETER} 标签 in 值不正确："${iss.input}"，支持的值有：${VALID_PARAMETER_IN.join(", ")}`,
      }),
      description: z.string().optional(),
      yaml: z.record(z.string(), z.unknown()).nullable().optional(),
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
  private buildParameter(params: ParameterTagData): OperationData {
    const { name, paramIn, description, yaml } = params;
    const parameterBuilder = new ParameterBuilder(name, paramIn);

    let finalDescription = description;

    if (yaml) {
      if (yaml.description) {
        finalDescription = yaml.description;
      }

      if (yaml.required !== undefined) {
        parameterBuilder.setRequired(yaml.required);
      }

      if (yaml.deprecated !== undefined) {
        parameterBuilder.setDeprecated(yaml.deprecated);
      }

      if (yaml.allowEmptyValue !== undefined) {
        parameterBuilder.setAllowEmptyValue(yaml.allowEmptyValue);
      }

      if (yaml.style) {
        parameterBuilder.setStyle(yaml.style);
      }

      if (yaml.explode !== undefined) {
        parameterBuilder.setExplode(yaml.explode);
      }

      if (yaml.allowReserved !== undefined) {
        parameterBuilder.setAllowReserved(yaml.allowReserved);
      }

      if (yaml.schema) {
        parameterBuilder.setSchema(yaml.schema);
      }

      if (yaml.content) {
        Object.entries(yaml.content).forEach(([mediaType, mediaTypeObject]) => {
          parameterBuilder.addContent(mediaType, mediaTypeObject);
        });
      }

      Object.entries(yaml).forEach(([key, value]) => {
        if (isExtensionKey(key)) {
          parameterBuilder.addExtension(key, value);
        }
      });
    }

    if (finalDescription) {
      parameterBuilder.setDescription(finalDescription);
    }

    return {
      parameters: [parameterBuilder.build()],
    };
  }
}
