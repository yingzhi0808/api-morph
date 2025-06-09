/**
 * 移除字符串两端的引号（单引号或双引号）。
 * @param text 可能包含引号的文本。
 * @returns 移除引号后的文本。
 */
export function removeQuotes(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

/**
 * 对字符串进行反转义处理，将 `\"` 转为 `"`，`\'` 转为 `'`，`\\` 转为 `\`，`\{` 转为 `{`，`\}` 转为 `}`。
 * @param text 可能包含转义字符的文本。
 * @returns 反转义后的文本。
 */
export function unescapeString(text: string) {
  return text.replace(/\\("|'|\\|\{|\})/g, "$1");
}

/**
 * 将字符串按空白和引号分割为词元，支持单双引号、大括号和转义。
 * @param text 输入的字符串文本
 * @returns 词元数组
 */
export function tokenizeString(text: string) {
  const trimmedLine = text.trim();
  if (!trimmedLine) {
    return [];
  }

  const values: string[] = [];
  const valueRegex = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\{(?:[^{}\\]|\\.)*\}|[^\s'"]+/g;
  let currentMatch: RegExpExecArray | null;

  while (true) {
    currentMatch = valueRegex.exec(trimmedLine);
    if (currentMatch === null) {
      break;
    }

    const rawValue = currentMatch[0];
    let cleanedValue: string;

    if (rawValue.startsWith("{") && rawValue.endsWith("}") && rawValue.length >= 2) {
      cleanedValue = unescapeString(rawValue.slice(1, -1)).trim();
    } else {
      cleanedValue = unescapeString(removeQuotes(rawValue)).trim();
    }

    if (cleanedValue.length > 0) {
      values.push(cleanedValue);
    }
  }
  return values;
}
