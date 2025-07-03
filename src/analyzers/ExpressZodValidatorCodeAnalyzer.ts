import type { Node, ObjectLiteralExpression } from "ts-morph";
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
 * Express Zod 验证中间件代码分析器，负责从 Express 路由中的 zodValidator 中间件调用中提取 Zod schema
 * 并转换为 OpenAPI 的参数和请求体定义
 */
export class ExpressZodValidatorCodeAnalyzer extends CodeAnalyzer {
  /**
   * 分析节点中的 zodValidator 调用，提取 Zod schema
   * @param node 节点
   * @returns 提取的 Zod schemas
   */
  async analyze(node: Node): Promise<OperationData> {
    const zodValidatorCall = this.findZodValidatorCall(node);
    if (!zodValidatorCall) {
      return {};
    }

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

    let schemaNames: Record<string, string> = {};
    const optionsArg = zodValidatorCall.getArguments()[0];
    if (optionsArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
      schemaNames = this.extractZodSchemaNames(optionsArg);
    }

    return this.convertRuntimeSchemaToOperationData(schemaInfo, schemaNames);
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
   * 查找节点中的 zodValidator 调用
   * @param node 节点
   * @returns zodValidator 调用节点
   */
  private findZodValidatorCall(node: Node) {
    const expression = node.getFirstChildByKindOrThrow(SyntaxKind.CallExpression);
    const args = expression.getArguments();

    for (const arg of args) {
      if (arg.isKind(SyntaxKind.CallExpression)) {
        const expression = arg.getExpression();
        if (expression.isKind(SyntaxKind.Identifier) && expression.getText() === "zodValidator") {
          return arg;
        }
      }
    }
    return null;
  }

  /**
   * 从 zodValidator 的选项对象中提取 Zod schema 名称
   * @param optionsObject zodValidator 的选项对象
   * @returns 提取的 Zod schema 名称. e.g. { body: 'UserSchema', query: 'ListQuerySchema' }
   */
  private extractZodSchemaNames(optionsObject: ObjectLiteralExpression) {
    const schemaNames: Record<string, string> = {};
    const properties = optionsObject.getChildrenOfKind(SyntaxKind.PropertyAssignment);

    for (const property of properties) {
      const nameNode = property.getNameNode();
      const initializer = property.getInitializer();
      if (initializer?.isKind(SyntaxKind.Identifier)) {
        schemaNames[nameNode.getText()] = initializer.getText();
      }
    }
    return schemaNames;
  }

  /**
   * 将运行时 Schema 信息转换为 OperationData
   * @param schemaInfo 运行时 Schema 信息
   * @param schemaNames 从代码中提取的 Schema 名称
   * @returns 转换后的 OperationData
   */
  private convertRuntimeSchemaToOperationData(
    schemaInfo: SchemaInfo,
    schemaNames: Record<string, string>,
  ) {
    const operationData: OperationData = {};

    if (schemaInfo.schemas.body) {
      const schemaName = schemaNames.body;
      operationData.requestBody = this.createRequestBodyFromSchema(
        schemaInfo.schemas.body,
        schemaName,
      );
    }
    if (schemaInfo.schemas.query) {
      operationData.parameters = [
        ...(operationData.parameters || []),
        ...this.createParametersFromSchema(schemaInfo.schemas.query, "query"),
      ];
    }
    if (schemaInfo.schemas.params) {
      operationData.parameters = [
        ...(operationData.parameters || []),
        ...this.createParametersFromSchema(schemaInfo.schemas.params, "path"),
      ];
    }
    if (schemaInfo.schemas.headers) {
      operationData.parameters = [
        ...(operationData.parameters || []),
        ...this.createParametersFromSchema(schemaInfo.schemas.headers, "header"),
      ];
    }

    return operationData;
  }
}
