import { isPlainObject } from "radashi";
import type { JSDocLink, JSDocTag } from "ts-morph";
import { SyntaxKind } from "typescript";
import YAML from "yaml";
import z from "zod/v4";
import type { JSDocTagName } from "@/constants";
import { isZodType } from "@/helpers";
import type { OperationData, ParseContext, ParsedTagParams, SchemaObject } from "@/types";
import { tokenizeString } from "@/utils";

/**
 * 标签解析器接口，所有标签解析器必须实现此接口
 */
export abstract class TagParser {
  /** 解析器支持的 JSDoc 标签名称列表 */
  abstract readonly tags: (JSDocTagName | (string & {}))[];

  /**
   * 创建标签解析器实例。
   * @param context 解析上下文。
   */
  constructor(public context: ParseContext) {}

  /**
   * 获取解析器支持的标签名称。
   * @returns 解析器支持的标签名称数组。
   */
  getTags() {
    return this.tags;
  }

  /**
   * 解析 JSDoc 标签。
   * @param tag JSDoc 标签对象。
   * @returns 解析结果。
   */
  abstract parse(tag: JSDocTag): Promise<OperationData> | OperationData;

  /**
   * 转换参数的钩子方法，子类可以重写此方法来完全控制参数转换。
   * @param params 参数对象。
   * @param tag JSDoc 标签对象。
   * @returns 转换后的参数对象。
   */
  protected abstract transformParams(params: ParsedTagParams, tag: JSDocTag): unknown;

  /**
   * 获取标签的完整多行内容。
   * @param tag JSDoc 标签对象。
   * @returns 标签的所有行文本内容，保留缩进格式，去掉星号和星号前空格，去掉尾部连续的空行。
   */
  protected extractTagContentLines(tag: JSDocTag) {
    const tagName = tag.getTagName();
    const tagNamePattern = new RegExp(`@${tagName}`);

    const lines = tag
      .getFullText()
      .replace(tagNamePattern, "")
      .split("\n")
      .map((line, index) => (index === 0 ? line.trim() : line.replace(/^\s*\*\s?/, "").trimEnd()));

    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }

    return lines;
  }

  /**
   * 解析标签 inline 和 YAML 参数。
   * @param tag JSDoc 标签对象。
   * @returns 返回一个对象，包含：
   * - `inline`: inline 参数数组（通常为标签行的参数部分）
   * - `yaml`: YAML 参数对象（如果存在 YAML 参数并解析成功，否则为 undefined）
   * - `rawText`: 标签的原始注释文本内容
   */
  protected async parseTagParamsWithYaml(tag: JSDocTag): Promise<ParsedTagParams> {
    const processedTag = await this.preprocessJSDocLinks(tag);

    const rawText = tag.getCommentText()?.trim() ?? "";
    const lines = this.extractTagContentLines(processedTag);
    if (lines.length === 0) {
      return { inline: [], rawText };
    }

    // 第一行作为 inline 参数
    const firstLine = lines[0];
    const inline = firstLine ? tokenizeString(firstLine) : [];

    // 剩余行作为 YAML 解析
    let parsedYaml: Record<string, unknown> | undefined;
    if (lines.length > 1) {
      const yamlLines = lines.slice(1);
      const yamlContent = yamlLines.join("\n");

      if (yamlContent) {
        try {
          const parsed = YAML.parse(yamlContent);
          if (isPlainObject(parsed)) {
            parsedYaml = parsed as Record<string, unknown>;
          }
        } catch {
          // 忽略 YAML 解析异常
        }
      }
    }

    return { inline, yaml: parsedYaml, rawText };
  }

  /**
   * 查找标签中的 JSDocLink 节点
   * @param tag JSDoc 标签对象
   * @returns JSDocLink 节点数组
   */
  private findSchemaJSDocLinks(tag: JSDocTag) {
    const comment = tag.getComment();
    const schemaLinks: JSDocLink[] = [];

    if (!Array.isArray(comment)) {
      return schemaLinks;
    }

    for (let i = 0; i < comment.length; i++) {
      const item = comment[i];

      if (item?.isKind(SyntaxKind.JSDocText)) {
        const nextItem = comment[i + 1];
        if (nextItem?.isKind(SyntaxKind.JSDocLink)) {
          schemaLinks.push(nextItem);
        }
      }
    }

    return schemaLinks;
  }

  /**
   * 预处理JSDoc链接，将 {@link xxx} 替换为实际的JSON Schema引用
   * @param tag JSDoc 标签对象。
   */
  private async preprocessJSDocLinks(tag: JSDocTag) {
    let replacedText = tag.getFullText();

    const jsDocLinks = this.findSchemaJSDocLinks(tag);
    if (jsDocLinks.length === 0) {
      return tag;
    }

    for (const jsDocLink of jsDocLinks) {
      const identifier = jsDocLink.getFirstDescendantByKind(SyntaxKind.Identifier);
      if (!identifier) {
        continue;
      }

      const definitionNode = identifier.getDefinitionNodes()[0];
      if (!definitionNode) {
        continue;
      }

      if (!isZodType(definitionNode)) {
        continue;
      }

      const filePath = definitionNode.getSourceFile().getFilePath();
      const module = await import(filePath);

      const identifierName = identifier.getText();
      const schema = z.toJSONSchema(module[identifierName]) as SchemaObject;

      if (!this.context.schemas.has(identifierName)) {
        this.context.schemas.set(identifierName, schema);
      }

      const schemaRef = `{ $ref: "#/components/schemas/${identifierName}" }`;
      replacedText = replacedText.replace(jsDocLink.getText(), schemaRef);
    }

    return tag.replaceWithText(replacedText) as JSDocTag;
  }
}
