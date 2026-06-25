export function seedUnifiedCoachMessages({ messages = [], wellnessMessages = [], adhdMessages = [] } = {}) {
  const currentMessages = asMessageArray(messages);
  if (currentMessages.length) return currentMessages;
  return mergeCoachHistories(wellnessMessages, adhdMessages);
}

export function mergeCoachHistories(...histories) {
  const seen = new Set();
  return histories.flatMap(asMessageArray).filter((message) => {
    const key = `${message.role || ""}:${message.content || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asMessageArray(value) {
  return Array.isArray(value) ? value.filter((message) => message && typeof message === "object") : [];
}
