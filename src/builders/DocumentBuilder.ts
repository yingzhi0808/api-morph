import { assign, cloneDeep } from "radashi";
import type {
  CallbackObject,
  ContactObject,
  ExampleObject,
  ExternalDocumentationObject,
  HeaderObject,
  InfoObject,
  LicenseObject,
  LinkObject,
  OpenAPIObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
  ServerObject,
  TagObject,
} from "@/types";
import type { Builder } from "./Builder";
import type { PathItemBuilder } from "./PathItemBuilder";

/**
 * 文档构建器，用于构建完整的 OpenAPI 文档
 */
export class DocumentBuilder implements Builder<OpenAPIObject> {
  private document: OpenAPIObject;

  constructor(document?: Partial<Omit<OpenAPIObject, "info"> & { info: Partial<InfoObject> }>) {
    const defaultDocument: OpenAPIObject = {
      openapi: "3.1.0",
      info: { title: "", version: "1.0.0" },
    };
    const finalDocument = assign(defaultDocument, document ?? {}) as OpenAPIObject;
    this.document = cloneDeep(finalDocument);
  }

  build() {
    return cloneDeep(this.document);
  }

  /**
   * 设置 OpenAPI 版本。
   * @param version OpenAPI 版本。
   * @returns 文档构建器。
   */
  setOpenAPIVersion(version: OpenAPIObject["openapi"]) {
    this.document.openapi = version;
    return this;
  }

  /**
   * 设置 API 标题。
   * @param title API 标题。
   * @returns 文档构建器。
   */
  setTitle(title: string) {
    this.document.info.title = title;
    return this;
  }

  /**
   * 设置 API 摘要。
   * @param summary API 摘要。
   * @returns 文档构建器。
   */
  setSummary(summary: string) {
    this.document.info.summary = summary;
    return this;
  }

  /**
   * 设置 API 描述。
   * @param description API 描述。
   * @returns 文档构建器。
   */
  setDescription(description: string) {
    this.document.info.description = description;
    return this;
  }

  /**
   * 设置服务条款链接。
   * @param termsOfService 服务条款链接。
   * @returns 文档构建器。
   */
  setTermsOfService(termsOfService: string) {
    this.document.info.termsOfService = termsOfService;
    return this;
  }

  /**
   * 设置联系信息。
   * @param contact 联系信息对象。
   * @returns 文档构建器。
   */
  setContact(contact: ContactObject) {
    this.document.info.contact = contact;
    return this;
  }

  /**
   * 设置许可证信息。
   * @param license 许可证信息对象。
   * @returns 文档构建器。
   */
  setLicense(license: LicenseObject) {
    this.document.info.license = license;
    return this;
  }

  /**
   * 设置 API 版本。
   * @param version API 版本。
   * @returns 文档构建器。
   */
  setVersion(version: string) {
    this.document.info.version = version;
    return this;
  }

  /**
   * 添加 info 扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 文档构建器。
   */
  addInfoExtension(key: `x-${string}`, value: unknown) {
    const document = this.document;
    if (!document.info[key]) document.info[key] = value;
    return this;
  }

  /**
   * 设置 JSON Schema Dialect。
   * @param dialect JSON Schema Dialect URI。
   * @returns 文档构建器。
   */
  setJsonSchemaDialect(dialect: string) {
    this.document.jsonSchemaDialect = dialect;
    return this;
  }

  /**
   * 添加服务器信息到文档中。
   * @param server 要添加的服务器对象。
   * @returns 文档构建器。
   */
  addServer(server: ServerObject) {
    const document = this.document;
    if (!document.servers) document.servers = [];
    document.servers.push(server);
    return this;
  }

  /**
   * 添加路径项。
   * @param path API 路径。
   * @param pathItem 路径项对象。
   * @returns 文档构建器。
   */
  addPathItem(path: string, pathItem: PathItemObject) {
    const document = this.document;
    if (!document.paths) document.paths = {};
    if (!document.paths[path]) document.paths[path] = pathItem;
    return this;
  }

  /**
   * 使用 PathItemBuilder 添加路径项。
   * @param pathItemBuilder 路径项构建器实例。
   * @returns 文档构建器。
   */
  addPathItemFromBuilder(path: string, pathItemBuilder: PathItemBuilder) {
    const pathItem = pathItemBuilder.build();
    return this.addPathItem(path, pathItem);
  }

  /**
   * 添加 paths 扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 文档构建器。
   */
  addPathsExtension(key: `x-${string}`, value: unknown) {
    const document = this.document;
    if (!document.paths) document.paths = {};
    if (!document.paths[key]) document.paths[key] = value;
    return this;
  }

  /**
   * 添加 Webhook。
   * @param name Webhook 名称。
   * @param webhook Webhook 的 PathItemObject。
   * @returns 文档构建器。
   */
  addWebhook(name: string, webhook: PathItemObject) {
    const document = this.document;
    if (!document.webhooks) document.webhooks = {};
    if (!document.webhooks[name]) document.webhooks[name] = webhook;
    return this;
  }

  /**
   * 添加安全要求。
   * @param securityRequirement 单个安全要求对象。
   * @returns 文档构建器。
   */
  addSecurity(securityRequirement: SecurityRequirementObject) {
    const document = this.document;
    if (!document.security) document.security = [];
    document.security.push(securityRequirement);
    return this;
  }

  /**
   * 添加标签定义到文档中。
   * @param tag 要添加的标签对象。
   * @returns 文档构建器。
   */
  addTag(tag: TagObject) {
    const document = this.document;
    if (!document.tags) document.tags = [];
    if (!document.tags.find((t) => t.name === tag.name)) document.tags.push(tag);
    return this;
  }

  /**
   * 设置外部文档。
   * @param externalDocs 外部文档对象。
   * @returns 文档构建器。
   */
  setExternalDocs(externalDocs: ExternalDocumentationObject) {
    this.document.externalDocs = externalDocs;
    return this;
  }

  /**
   * 添加扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 响应构建器。
   */
  addExtension(key: `x-${string}`, value: unknown) {
    const document = this.document;
    if (!document[key]) document[key] = value;
    return this;
  }

  /**
   * 添加 Schema 组件到 components。
   * @param name Schema 名称。
   * @param schema Schema 对象。
   * @returns 文档构建器。
   */
  addSchemaToComponents(name: string, schema: SchemaObject | boolean) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components.schemas) document.components.schemas = {};
    if (!document.components.schemas[name]) document.components.schemas[name] = schema;
    return this;
  }

  /**
   * 添加响应组件到 components。
   * @param name 响应名称。
   * @param response 响应对象或引用对象。
   * @returns 文档构建器。
   */
  addResponseToComponents(name: string, response: ResponseObject | ReferenceObject) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components.responses) document.components.responses = {};
    if (!document.components.responses[name]) document.components.responses[name] = response;
    return this;
  }

  /**
   * 添加参数组件到 components。
   * @param name 参数名称。
   * @param parameter 参数对象或引用对象。
   * @returns 文档构建器。
   */
  addParameterToComponents(name: string, parameter: ParameterObject | ReferenceObject) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components.parameters) document.components.parameters = {};
    if (!document.components.parameters[name]) document.components.parameters[name] = parameter;
    return this;
  }

  /**
   * 添加示例组件到 components。
   * @param name 示例名称。
   * @param example 示例对象或引用对象。
   * @returns 文档构建器。
   */
  addExampleToComponents(name: string, example: ExampleObject | ReferenceObject) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components.examples) document.components.examples = {};
    if (!document.components.examples[name]) document.components.examples[name] = example;
    return this;
  }

  /**
   * 添加请求体组件到 components。
   * @param name 请求体名称。
   * @param requestBody 请求体对象或引用对象。
   * @returns 文档构建器。
   */
  addRequestBodyToComponents(name: string, requestBody: RequestBodyObject | ReferenceObject) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components.requestBodies) document.components.requestBodies = {};
    if (!document.components.requestBodies[name])
      document.components.requestBodies[name] = requestBody;
    return this;
  }

  /**
   * 添加头部组件到 components。
   * @param name 头部名称。
   * @param header 头部对象或引用对象。
   * @returns 文档构建器。
   */
  addHeaderToComponents(name: string, header: HeaderObject | ReferenceObject) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components.headers) document.components.headers = {};
    if (!document.components.headers[name]) document.components.headers[name] = header;
    return this;
  }

  /**
   * 添加安全方案组件到 components。
   * @param name 安全方案名称。
   * @param securityScheme 安全方案对象或引用对象。
   * @returns 文档构建器。
   */
  addSecuritySchemeToComponents(
    name: string,
    securityScheme: SecuritySchemeObject | ReferenceObject,
  ) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components.securitySchemes) document.components.securitySchemes = {};
    if (!document.components.securitySchemes[name]) {
      document.components.securitySchemes[name] = securityScheme;
    }
    return this;
  }

  /**
   * 添加链接组件到 components。
   * @param name 链接名称。
   * @param link 链接对象或引用对象。
   * @returns 文档构建器。
   */
  addLinkToComponents(name: string, link: LinkObject | ReferenceObject) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components.links) document.components.links = {};
    if (!document.components.links[name]) document.components.links[name] = link;
    return this;
  }

  /**
   * 添加回调组件到 components。
   * @param name 回调名称。
   * @param callback 回调对象或引用对象。
   * @returns 文档构建器。
   */
  addCallbackToComponents(name: string, callback: CallbackObject | ReferenceObject) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components.callbacks) document.components.callbacks = {};
    if (!document.components.callbacks[name]) document.components.callbacks[name] = callback;
    return this;
  }

  /**
   * 添加路径项组件到 components。
   * @param name 路径项名称。
   * @param pathItem 路径项对象或引用对象。
   * @returns 文档构建器。
   */
  addPathItemToComponents(name: string, pathItem: PathItemObject) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components.pathItems) document.components.pathItems = {};
    if (!document.components.pathItems[name]) document.components.pathItems[name] = pathItem;
    return this;
  }

  /**
   * 添加组件扩展字段。
   * @param key 扩展字段键（必须以 'x-' 开头）。
   * @param value 扩展字段值。
   * @returns 文档构建器。
   */
  addComponentsExtension(key: `x-${string}`, value: unknown) {
    const document = this.document;
    if (!document.components) document.components = {};
    if (!document.components[key]) document.components[key] = value;
    return this;
  }
}
