import type { JSDocTag } from "ts-morph";
import { type JSDocLink, SyntaxKind } from "ts-morph";

/**
 * 查找标签中的 JSDocLink 节点
 * @param tag JSDoc 标签对象
 * @returns JSDocLink 节点数组
 */
export function findSchemaJSDocLinks(tag: JSDocTag): JSDocLink[] {
  const comment = tag.getComment();
  const schemaLinks: JSDocLink[] = [];

  if (!Array.isArray(comment)) return schemaLinks;

  for (let i = 0; i < comment.length; i++) {
    const item = comment[i];

    if (item?.isKind(SyntaxKind.JSDocText)) {
      const nextItem = comment[i + 1];
      if (nextItem?.isKind(SyntaxKind.JSDocLink)) schemaLinks.push(nextItem);
    }
  }

  return schemaLinks;
}
