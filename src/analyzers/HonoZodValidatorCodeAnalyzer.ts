import type { CallExpression, Node, NoSubstitutionTemplateLiteral, StringLiteral } from "ts-morph";
import { SyntaxKind } from "typescript";
import type { JSONSchema } from "zod/v4/core";
import { type SchemaInfo, SchemaRegistry } from "@/registry/SchemaRegistry";
import type { ParameterIn } from "@/types/common";
import type {
  ExampleObject,
  ParameterObject,
  RequestBodyObject,
  SchemaObject,
} from "@/types/openapi";
import type { OperationData } from "@/types/parser";
import { CodeAnalyzer } from "./CodeAnalyzer";

/**
 * Hono Zod 验证中间件代码分析器，负责从 Hono 路由中的 zodValidator 中间件调用中提取 Zod schema
 * 并转换为 OpenAPI 的参数和请求体定义
 */
export class HonoZodValidatorCodeAnalyzer extends CodeAnalyzer {
  /**
   * 分析节点中的 zodValidator 调用，提取 Zod schema
   * @param node 节点
   * @returns 提取的 Zod schemas
   */
  async analyze(node: Node): Promise<OperationData> {
    const zodValidatorCalls = this.findAllZodValidatorCalls(node);
    if (zodValidatorCalls.length === 0) {
      return {};
    }

    const operationData: OperationData = {};

    // 处理所有的 zodValidator 调用
    for (const zodValidatorCall of zodValidatorCalls) {
      const singleResult = await this.analyzeSingleZodValidatorCall(zodValidatorCall);

      // 合并结果
      if (singleResult.requestBody) {
        operationData.requestBody = singleResult.requestBody;
      }
      if (singleResult.parameters) {
        operationData.parameters = [
          ...(operationData.parameters || []),
          ...singleResult.parameters,
        ];
      }
    }

    return operationData;
  }

  /**
   * 分析单个 zodValidator 调用
   * @param zodValidatorCall zodValidator 调用节点
   * @returns 提取的 Zod schemas
   */
  private async analyzeSingleZodValidatorCall(
    zodValidatorCall: CallExpression,
  ): Promise<OperationData> {
    // 获取文件路径和行号
    const sourceFile = zodValidatorCall.getSourceFile();
    const filePath = sourceFile.getFilePath();
    const lineNumber = zodValidatorCall.getStartLineNumber();
    const location = `${filePath}:${lineNumber}`;
    const registry = SchemaRegistry.getInstance();
    const schemaInfo = registry.get(location);

    if (!schemaInfo) {
      return {};
    }

    const args = zodValidatorCall.getArguments();

    const targetArg = args[0] as StringLiteral | NoSubstitutionTemplateLiteral;
    const target = targetArg.getLiteralText();

    const schemaArg = args[1];
    let schemaName: string | undefined;
    if (schemaArg.isKind(SyntaxKind.Identifier)) {
      schemaName = schemaArg.getText();
    }

    return this.convertSingleTargetSchemaToOperationData(schemaInfo, target, schemaName);
  }

  /**
   * 从 Zod schema 创建 OpenAPI RequestBody
   * @param schema JSON schema
   * @param schemaName schema 名称
   * @returns 创建的 OpenAPI RequestBody
   */
  private createRequestBodyFromSchema(
    schema: JSONSchema.BaseSchema,
    schemaName?: string,
  ): RequestBodyObject {
    const mediaType = this.context.options.defaultRequestBodyMediaType!;

    // 将 schema 添加到全局 schemas 中
    if (schemaName && !this.context.schemas.has(schemaName)) {
      this.context.schemas.set(schemaName, schema as SchemaObject);
    }

    const schemaObject = schemaName ? { $ref: `#/components/schemas/${schemaName}` } : schema;

    return {
      content: {
        [mediaType]: { schema: schemaObject as SchemaObject },
      },
    };
  }

  /**
   * 从 JSON Schema 创建 OpenAPI Parameters
   * @param schema JSON schema
   * @param paramIn 参数位置
   * @returns 创建的 OpenAPI Parameters
   */
  private createParametersFromSchema(schema: JSONSchema.BaseSchema, paramIn: ParameterIn) {
    const parameters: ParameterObject[] = [];

    if (schema.type === "object" && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const isRequired = schema.required?.includes(propName) || false;
        const cleanSchema = { ...(propSchema as Record<string, unknown>) };

        // 提取 parameter 级别的属性
        const parameterProps: Pick<
          ParameterObject,
          "description" | "deprecated" | "example" | "examples" | "allowEmptyValue"
        > = {};

        // 从 schema 中提取并移除 parameter 级别的属性
        if (cleanSchema.description) {
          parameterProps.description = cleanSchema.description as string;
          delete cleanSchema.description;
        }

        if (cleanSchema.deprecated) {
          parameterProps.deprecated = cleanSchema.deprecated as boolean;
          delete cleanSchema.deprecated;
        }

        if (cleanSchema.allowEmptyValue) {
          parameterProps.allowEmptyValue = cleanSchema.allowEmptyValue as boolean;
          delete cleanSchema.allowEmptyValue;
        }

        if (cleanSchema.example) {
          parameterProps.example = cleanSchema.example;
          delete cleanSchema.example;
        }

        if (cleanSchema.examples) {
          parameterProps.examples = cleanSchema.examples as unknown as Record<
            string,
            ExampleObject
          >;
          delete cleanSchema.examples;
        }

        const parameter: ParameterObject = {
          name: propName,
          in: paramIn,
          required: paramIn === "path" ? true : isRequired,
          schema: cleanSchema as SchemaObject,
          ...parameterProps,
        };

        parameters.push(parameter);
      }
    }

    return parameters;
  }

  /**
   * 查找节点中的所有 zodValidator 调用
   * @param node 节点
   * @returns 所有 zodValidator 调用节点的数组
   */
  private findAllZodValidatorCalls(node: Node) {
    const zodValidatorCalls: CallExpression[] = [];
    const expression = node.getFirstChildByKindOrThrow(SyntaxKind.CallExpression);
    const args = expression.getArguments();

    for (const arg of args) {
      if (arg.isKind(SyntaxKind.CallExpression)) {
        const expression = arg.getExpression();
        if (expression.isKind(SyntaxKind.Identifier) && expression.getText() === "zodValidator") {
          zodValidatorCalls.push(arg);
        }
      }
    }
    return zodValidatorCalls;
  }

  /**
   * 将单个 target 的 Schema 信息转换为 OperationData
   * @param schemaInfo 运行时 Schema 信息
   * @param target zodValidator 的 target
   * @param schemaName 从代码中提取的 Schema 名称
   * @returns 转换后的 OperationData
   */
  private convertSingleTargetSchemaToOperationData(
    schemaInfo: SchemaInfo,
    target: string,
    schemaName?: string,
  ) {
    const operationData: OperationData = {};

    // 根据 target 类型获取对应的 schema
    let schema: JSONSchema.BaseSchema | undefined;
    let paramIn: ParameterIn | undefined;

    switch (target) {
      case "json":
      case "form":
        schema = schemaInfo.schemas.body;
        if (schema) {
          operationData.requestBody = this.createRequestBodyFromSchema(schema, schemaName);
        }
        break;
      case "query":
        schema = schemaInfo.schemas.query;
        paramIn = "query";
        break;
      case "param":
        schema = schemaInfo.schemas.params;
        paramIn = "path";
        break;
      case "header":
        schema = schemaInfo.schemas.headers;
        paramIn = "header";
        break;
    }

    // 如果是参数类型的 schema，转换为 parameters
    if (schema && paramIn) {
      operationData.parameters = this.createParametersFromSchema(schema, paramIn);
    }

    return operationData;
  }
}
