export function parseInlineMarkdown(text) {
  const source = typeof text === "string" ? text : "";
  const tokens = [];
  let cursor = 0;

  while (cursor < source.length) {
    if (source.startsWith("**", cursor)) {
      const end = source.indexOf("**", cursor + 2);
      if (end > cursor + 2) {
        tokens.push({ type: "strong", text: source.slice(cursor + 2, end) });
        cursor = end + 2;
        continue;
      }
      tokens.push({ type: "text", text: source.slice(cursor) });
      break;
    }

    if (source[cursor] === "*" && !source.startsWith("**", cursor)) {
      const end = source.indexOf("*", cursor + 1);
      if (end > cursor + 1 && !source.startsWith("*", end + 1)) {
        tokens.push({ type: "em", text: source.slice(cursor + 1, end) });
        cursor = end + 1;
        continue;
      }
      tokens.push({ type: "text", text: source.slice(cursor) });
      break;
    }

    const nextStrong = source.indexOf("**", cursor + 1);
    const nextEm = source.indexOf("*", cursor + 1);
    const candidates = [nextStrong, nextEm].filter((index) => index > cursor);
    const nextMarker = candidates.length ? Math.min(...candidates) : source.length;
    tokens.push({ type: "text", text: source.slice(cursor, nextMarker) });
    cursor = nextMarker;
  }

  return tokens;
}
