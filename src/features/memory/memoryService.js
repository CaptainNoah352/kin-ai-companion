const emptyMemory = {
  aboutMe: "",
  supportStyle: "",
  importantContext: "",
  summaries: [],
};

export const MEMORY_SUMMARY_LIMIT = 12;
export const AI_MEMORY_SUMMARY_LIMIT = 5;
export const MEMORY_SUMMARY_MIN_LENGTH = 12;

export function createDefaultMemory(memory) {
  return {
    ...emptyMemory,
    ...(memory || {}),
    aboutMe: normalizeProfileText(memory?.aboutMe),
    supportStyle: normalizeProfileText(memory?.supportStyle),
    importantContext: normalizeProfileText(memory?.importantContext),
    summaries: Array.isArray(memory?.summaries)
      ? memory.summaries.map(normalizeMemorySummary).filter(Boolean).slice(0, MEMORY_SUMMARY_LIMIT)
      : [],
  };
}

export function buildConversationSummary(messages = []) {
  const recentUserMessages = messages
    .filter((message) => message.role === "user")
    .slice(-6)
    .map((message) => message.content.trim())
    .filter(Boolean);

  if (!recentUserMessages.length) {
    return "No user messages yet. Add a custom note instead.";
  }

  const summary = recentUserMessages
    .map((message) => message.replace(/\s+/g, " ").slice(0, 180))
    .join(" | ");

  return summary.length > 560 ? `${summary.slice(0, 557)}...` : summary;
}

export function makeMemorySummary(text) {
  const trimmed = compactText(text);
  if (trimmed.length < MEMORY_SUMMARY_MIN_LENGTH) return null;

  return {
    id: globalThis.crypto?.randomUUID?.() || `summary-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: trimmed.slice(0, 600),
    createdAt: new Date().toISOString(),
  };
}

export function addMemorySummary(memory, text, { limit = MEMORY_SUMMARY_LIMIT } = {}) {
  const summary = makeMemorySummary(text);
  if (!summary) return createDefaultMemory(memory);

  const current = createDefaultMemory(memory);
  return {
    ...current,
    summaries: [summary, ...current.summaries].slice(0, limit),
    updatedAt: new Date().toISOString(),
  };
}

export function sanitizeMemoryForAi(memory, { summaryLimit = AI_MEMORY_SUMMARY_LIMIT } = {}) {
  const current = createDefaultMemory(memory);
  const summaries = current.summaries
    .slice(0, summaryLimit)
    .map((summary) => ({
      text: compactText(summary.text).slice(0, 400),
      createdAt: compactText(summary.createdAt).slice(0, 40),
    }))
    .filter((summary) => summary.text);

  const sanitized = {
    aboutMe: compactText(current.aboutMe).slice(0, 1000),
    supportStyle: compactText(current.supportStyle).slice(0, 1000),
    importantContext: compactText(current.importantContext).slice(0, 1000),
    summaries,
  };

  return Object.values(sanitized).some((value) => (Array.isArray(value) ? value.length : value)) ? sanitized : null;
}

export function getMemoryStats(memory) {
  const current = createDefaultMemory(memory);
  return {
    summaryCount: current.summaries.length,
    updatedAt: current.updatedAt || current.summaries[0]?.createdAt || "",
  };
}

function normalizeMemorySummary(summary) {
  if (!summary || typeof summary !== "object") return null;
  const text = compactText(summary.text);
  if (!text) return null;
  return {
    id: compactText(summary.id) || `summary-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: text.slice(0, 600),
    createdAt: compactText(summary.createdAt) || new Date().toISOString(),
  };
}

function normalizeProfileText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function compactText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}
