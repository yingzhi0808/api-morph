/** biome-ignore-all lint/suspicious/noExplicitAny: any is used for extension */

import type { JSDocTag, Node, Project, TypeChecker } from "ts-morph";
import type { CodeAnalyzer } from "@/analyzers/CodeAnalyzer";
import type { FrameworkAnalyzer } from "@/analyzers/FrameworkAnalyzer";
import type { TagParser } from "@/parsers/TagParser";
import type { HttpMethod } from "./common";
import type {
  CallbackObject,
  ExternalDocumentationObject,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  SecurityRequirementObject,
  ServerObject,
} from "./openapi";

/**
 * 解析选项
 *
 * @category Types
 */
export interface ParserOptions {
  /** 要包含的文件模式 */
  include?: string[];
  /** 要排除的文件模式 */
  exclude?: string[];
  /** 默认的响应媒体类型 */
  defaultResponseMediaType?: string;
  /** 默认的请求体媒体类型 */
  defaultRequestBodyMediaType?: string;
  /** 自定义标签解析器 */
  customTagParsers?: (new (
    context: ParseContext,
  ) => TagParser)[];
  /** 自定义框架分析器 */
  customFrameworkAnalyzers?: (new (
    context: ParseContext,
  ) => FrameworkAnalyzer)[];
  /** 自定义Expres代码分析器 */
  customExpressCodeAnalyzers?: (new (
    context: ParseContext,
  ) => CodeAnalyzer)[];
  /** 自定义Koa代码分析器 */
  customKoaCodeAnalyzers?: (new (
    context: ParseContext,
  ) => CodeAnalyzer)[];
  /** 自定义Hono代码分析器 */
  customHonoCodeAnalyzers?: (new (
    context: ParseContext,
  ) => CodeAnalyzer)[];
  /**
   * 是否启用代码分析
   * @default true
   */
  enableCodeAnalysis?: boolean;
  /**
   * 自定义 `operationId` 生成函数，如果提供，将使用此函数生成 `operationId`。
   * 返回 `null` 表示不生成 `operationId`。
   */
  generateOperationId?: GenerateOperationIdFunction;
}

/**
 * 解析上下文接口，提供解析过程中需要的所有共享状态和工具
 *
 * @category Types
 */
export interface ParseContext {
  /** ts-morph Project 实例 */
  project: Project;
  /** ts-morph TypeChecker 实例 */
  typeChecker: TypeChecker;
  /** 全局 Schema 缓存，避免重复转换同一类型 */
  readonly schemas: Map<string, SchemaObject>;
  /** 解析选项 */
  readonly options: ParserOptions;
}

/**
 * 自定义 operationId 生成函数类型
 *
 * @category Types
 */
export type GenerateOperationIdFunction = (
  method: HttpMethod,
  path: string,
  fileName: string,
  functionName?: string,
) => string | null;

/**
 * 表示待解析的 Operation 源数据
 *
 * @category Types
 */
export interface SourceOperationData {
  /**代码节点 */
  node: Node;
  /** 该节点关联的所有 JSDoc 标签 */
  tags: JSDocTag[];
}

/**
 * OperationComposer 解析后的结果
 *
 * @category Types
 */
export interface ParsedOperation {
  /** API 路径 */
  path: string;
  /** HTTP 方法 */
  method: HttpMethod;
  /** 操作对象 */
  operation: OperationObject;
}

/**
 * TagParser 解析后的结果
 *
 * @category Types
 */
export interface OperationData {
  /** HTTP 方法 */
  method?: HttpMethod;
  /** API 路径 */
  path?: string;
  /** 标签 */
  tags?: string[];
  /** 摘要 */
  summary?: string;
  /** 描述 */
  description?: string;
  /** 外部文档 */
  externalDocs?: ExternalDocumentationObject;
  /** 操作ID */
  operationId?: string;
  /** 参数定义 */
  parameters?: ParameterObject[];
  /** 请求体定义 */
  requestBody?: RequestBodyObject;
  /** 响应定义 */
  responses?: Record<string, ResponseObject>;
  /** 回调定义 */
  callback?: { name: string; callback: CallbackObject };
  /** 操作已废弃标志 */
  deprecated?: boolean;
  /** 安全要求 */
  security?: SecurityRequirementObject;
  /** 服务器定义 */
  servers?: ServerObject[];
  /** 扩展属性 */
  extensions?: Record<`x-${string}`, any>;
  /** 响应扩展属性 */
  responsesExtensions?: Record<`x-${string}`, any>;
}

/**
 * 外部文档标签内联参数类型
 *
 * @category Types
 */
export interface ExternalDocsTagParams {
  /** 外部文档URL */
  url: string;
  /** 外部文档描述 */
  description?: string;
  /** YAML参数对象 */
  yaml: Record<string, unknown>;
}

/**
 * 外部文档标签参数类型
 *
 * @category Types
 */
export interface ExternalDocsTagData {
  /** 外部文档URL */
  url: string;
  /** 外部文档描述 */
  description?: string;
  /** YAML参数对象 */
  yaml: ExternalDocumentationObject;
}

/**
 * 回调标签内联参数类型
 *
 * @category Types
 */
export interface CallbackTagParams {
  /** 回调名称 */
  callbackName: string;
  /** YAML参数对象 */
  yaml: Record<string, unknown>;
}

/**
 * 回调标签参数类型
 *
 * @category Types
 */
export interface CallbackTagData {
  /** 回调名称 */
  callbackName: string;
  /** YAML参数对象 */
  yaml: CallbackObject;
}

/**
 * 安全标签内联参数类型
 *
 * @category Types
 */
export interface SecurityTagParams {
  /** 安全方案名称 */
  schemeName: string;
  /** 安全范围 */
  scopes?: string[];
}

/**
 * 安全标签参数类型
 *
 * @category Types
 */
export interface SecurityTagData {
  /** 安全方案名称 */
  schemeName: string;
  /** 安全范围 */
  scopes?: string[];
}

/**
 * 服务器标签内联参数类型
 *
 * @category Types
 */
export interface ServerTagParams {
  /** 服务器URL */
  url: string;
  /** 服务器描述 */
  description?: string;
  /** YAML参数对象 */
  yaml?: Record<string, unknown>;
}

/**
 * 服务器标签参数类型
 *
 * @category Types
 */
export interface ServerTagData {
  /** 服务器URL */
  url: string;
  /** 服务器描述 */
  description?: string;
  /** YAML参数对象 */
  yaml?: ServerObject;
}
