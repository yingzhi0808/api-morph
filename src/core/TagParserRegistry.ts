import type { TagParser } from "@/parsers";

/**
 * 标签解析器注册表，用于管理和查找标签解析器
 */
export class TagParserRegistry {
  /** 标签名到解析器的映射 */
  private tagToParser = new Map<string, TagParser>();

  /**
   * 注册标签解析器，如果解析器支持的某个标签已被其他解析器注册，则会抛出错误。
   * @param parser 标签解析器实例。
   * @throws {Error} 如果标签冲突。
   */
  register(parser: TagParser) {
    // 获取解析器支持的标签
    const tags = parser.getTags();

    // 检查标签数组是否为空
    if (tags.length === 0) {
      throw new Error(`无效的解析器：解析器 "${parser.constructor.name}" 必须至少支持一个标签。`);
    }

    // 检查是否已经注册了相同的解析器实例
    const existingParsers = new Set(this.tagToParser.values());
    if (existingParsers.has(parser)) {
      throw new Error(`解析器已存在：解析器实例 "${parser.constructor.name}" 已经被注册。`);
    }

    // 检查标签冲突
    const conflictingTags: Array<{ tag: string; existingParser: string }> = [];
    for (const tagName of tags) {
      const existingParser = this.tagToParser.get(tagName);
      if (existingParser) {
        conflictingTags.push({
          tag: tagName,
          existingParser: existingParser.constructor.name,
        });
      }
    }

    if (conflictingTags.length > 0) {
      const conflictInfo = conflictingTags
        .map(({ tag, existingParser }) => `"@${tag}" (已被 ${existingParser} 注册)`)
        .join(", ");
      throw new Error(
        `标签冲突：解析器 "${parser.constructor.name}" 尝试注册的标签与现有解析器冲突。` +
          `冲突的标签：${conflictInfo}`,
      );
    }

    // 注册标签到解析器的映射
    for (const tagName of tags) {
      this.tagToParser.set(tagName, parser);
    }
  }

  /**
   * 根据标签名获取解析器。
   * @param tagName JSDoc 标签名称。
   * @returns 解析器实例，如果没有找到返回 undefined。
   */
  getParser(tagName: string) {
    return this.tagToParser.get(tagName);
  }

  /**
   * 获取所有已注册的标签名称。
   * @returns 所有已注册的标签名称数组。
   */
  getAllTagNames() {
    return Array.from(this.tagToParser.keys());
  }
}
