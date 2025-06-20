import { isPlainObject } from "radashi";
import type { Node } from "ts-morph";
import { SyntaxKind } from "typescript";
import z from "zod/v4";
import type { JSONSchema } from "zod/v4/core";
import type { ParameterIn } from "@/constants";
import { ASTAnalyzer } from "@/core";
import { isZodType } from "@/helpers";
import type {
  ExampleObject,
  OperationData,
  ParameterObject,
  RequestBodyObject,
  SchemaObject,
} from "@/types";

/**
 * Zod 验证中间件 AST 分析器
 * 负责从 Express 路由中的 validateRequest 中间件调用中提取 Zod schema
 * 并转换为 OpenAPI 的参数和请求体定义
 */
export class ZodValidationASTAnalyzer extends ASTAnalyzer {
  name = "ZodValidationASTAnalyzer";

  /**
   * 分析节点中的 validateRequest 调用，提取 Zod schema
   */
  async analyze(node: Node): Promise<OperationData> {
    const expression = node.getFirstChildByKind(SyntaxKind.CallExpression);
    if (!expression) {
      return {};
    }

    const args = expression.getArguments();
    if (args.length < 2) {
      return {};
    }

    // 查找 validateRequest 中间件调用
    const validateRequestCall = this.findValidateRequestCall(args);
    if (!validateRequestCall) {
      return {};
    }

    // 提取验证选项对象
    const optionsArg = validateRequestCall.getArguments()[0];
    if (!optionsArg || !optionsArg.isKind(SyntaxKind.ObjectLiteralExpression)) {
      return {};
    }

    return await this.extractZodSchemas(optionsArg);
  }

  /**
   * 在路由参数中查找 validateRequest 调用
   */
  private findValidateRequestCall(args: Node[]) {
    for (const arg of args) {
      // 直接的 validateRequest 调用
      if (arg.isKind(SyntaxKind.CallExpression)) {
        const expression = arg.getExpression();
        if (
          expression.isKind(SyntaxKind.Identifier) &&
          expression.getText() === "validateRequest"
        ) {
          return arg;
        }
      }
    }
    return null;
  }

  /**
   * 从 validateRequest 的选项对象中提取 Zod schemas
   */
  private async extractZodSchemas(optionsObject: Node): Promise<OperationData> {
    const operationData: OperationData = {};
    const properties = optionsObject.getChildrenOfKind(SyntaxKind.PropertyAssignment);

    for (const property of properties) {
      const nameNode = property.getNameNode();
      if (!nameNode.isKind(SyntaxKind.Identifier)) {
        continue;
      }

      const propertyName = nameNode.getText();
      const initializer = property.getInitializer();
      if (!initializer) {
        continue;
      }

      // 检查是否是 Zod schema
      const result = await this.extractZodSchema(initializer);
      if (!result) {
        continue;
      }

      // 根据属性名称转换为相应的 OpenAPI 结构
      switch (propertyName) {
        case "body":
          operationData.requestBody = this.createRequestBodyFromSchema(
            result.schema,
            result.schemaName,
          );
          break;
        case "query":
          operationData.parameters = [
            ...(operationData.parameters || []),
            ...this.createParametersFromSchema(result.schema, "query"),
          ];
          break;
        case "params":
          operationData.parameters = [
            ...(operationData.parameters || []),
            ...this.createParametersFromSchema(result.schema, "path"),
          ];
          break;
        case "headers":
          operationData.parameters = [
            ...(operationData.parameters || []),
            ...this.createParametersFromSchema(result.schema, "header"),
          ];
          break;
      }
    }

    return operationData;
  }

  /**
   * 从节点中提取 Zod schema 并转换为 JSON Schema
   */
  private async extractZodSchema(node: Node) {
    // 如果是标识符引用
    if (node.isKind(SyntaxKind.Identifier)) {
      const definition = node.getDefinitionNodes()[0];
      if (!definition || !isZodType(definition)) {
        return null;
      }

      // 动态导入模块并获取 schema
      const filePath = definition.getSourceFile().getFilePath();
      const schemaName = node.getText();

      const module = await import(filePath);
      const zodSchema = module[schemaName];

      if (!zodSchema) {
        return null;
      }

      // 转换为 JSON Schema
      const jsonSchema = z.toJSONSchema(zodSchema);

      // 缓存到全局 schemas 中
      if (!this.context.schemas.has(schemaName)) {
        this.context.schemas.set(schemaName, jsonSchema as SchemaObject);
      }

      return { schema: jsonSchema, schemaName };
    }

    // 如果是内联的 Zod schema 调用（如 z.object({...})）
    if (node.isKind(SyntaxKind.CallExpression)) {
      // 这种情况比较复杂，暂时跳过，可以在后续版本中支持
      return null;
    }

    return null;
  }

  /**
   * 从 Zod schema 创建 OpenAPI RequestBody
   */
  private createRequestBodyFromSchema(
    schema: JSONSchema.BaseSchema,
    schemaName?: string,
  ): RequestBodyObject {
    const mediaType = this.context.options.defaultRequestMediaType!;

    // 如果有 schema 名称且已缓存，使用 $ref 引用
    const schemaRef =
      schemaName && this.context.schemas.has(schemaName)
        ? { $ref: `#/components/schemas/${schemaName}` }
        : schema;

    return {
      content: {
        [mediaType]: { schema: schemaRef as SchemaObject },
      },
    };
  }

  /**
   * 从 SchemaObject 创建 OpenAPI Parameters
   */
  private createParametersFromSchema(schema: JSONSchema.BaseSchema, paramIn: ParameterIn) {
    const parameters: ParameterObject[] = [];

    // 如果是对象类型，为每个属性创建参数
    if (schema.type === "object" && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const isRequired = schema.required?.includes(propName) || false;

        // 确保 propSchema 是对象类型才进行处理
        if (!isPlainObject(propSchema)) {
          parameters.push({
            name: propName,
            in: paramIn,
            required: paramIn === "path" ? true : isRequired,
            schema: propSchema,
          });
          continue;
        }

        const cleanSchema = { ...propSchema };

        // 提取 parameter 级别的属性
        const parameterProps: Pick<
          ParameterObject,
          "description" | "deprecated" | "example" | "examples" | "allowEmptyValue"
        > = {};

        // 从 schema 中提取并移除 parameter 级别的属性
        if (cleanSchema.description) {
          parameterProps.description = cleanSchema.description;
          delete cleanSchema.description;
        }

        if (cleanSchema.deprecated) {
          parameterProps.deprecated = cleanSchema.deprecated;
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
}
