import { getCrisisResource } from "./crisisResources.js";
import { idiomPatterns, safetyRules } from "./safetyRules.js";

const pauseLevels = new Set(["moderate", "high", "imminent"]);
const levelRank = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
  imminent: 4,
};

export function classifySafety(input, context = {}) {
  const text = String(input || "").trim();
  const source = context.source || "ai_chat";

  if (!text) {
    return buildSignal({ source, category: "none", level: "none", confidence: 0, actions: [] });
  }

  const idiomOnly = idiomPatterns.some((pattern) => pattern.test(text));
  const matches = safetyRules
    .map((rule) => ({
      ...rule,
      matched: rule.patterns.some((pattern) => pattern.test(text)),
    }))
    .filter((rule) => rule.matched);

  if (!matches.length || (idiomOnly && !matches.some((rule) => levelRank[rule.level] >= 3))) {
    return buildSignal({ source, category: "none", level: "none", confidence: 0, actions: [] });
  }

  const strongest = matches.sort((a, b) => {
    if (levelRank[b.level] !== levelRank[a.level]) return levelRank[b.level] - levelRank[a.level];
    return b.confidence - a.confidence;
  })[0];

  return buildSignal({
    source,
    category: strongest.category,
    level: strongest.level,
    confidence: strongest.confidence,
    actions: strongest.actions,
    matchedTextHash: hashText(text),
    userId: context.userId,
  });
}

export function shouldPauseForSafety(signal) {
  return pauseLevels.has(signal?.level) || signal?.category === "suicide_plan_or_means";
}

export function isImminent(signal) {
  return signal?.level === "imminent" || signal?.category === "suicide_plan_or_means";
}

export function buildSafetyResponse(signal, region = "US") {
  const resource = getCrisisResource(region);
  const imminent = isImminent(signal);

  return {
    role: "assistant",
    blocked: true,
    crisis: imminent,
    safety: signal,
    recommendedModuleIds: ["safety-plan"],
    content: imminent
      ? `I cannot continue normal coaching here. If there is immediate danger, call ${resource.emergency} now. In the U.S., you can call or text ${resource.call || "988"} for the ${resource.crisisLine}. If you can, move away from anything you could use to hurt yourself or someone else and contact a trusted person nearby.`
      : `This sounds important enough to pause normal AI coaching and bring in human support. You can use ${resource.crisisLine} (${resource.call || resource.emergency}) or local emergency services if danger could be immediate. The app can help you open your safety plan, but it should not be your only support path.`,
    actions: signal?.actionTaken || signal?.actions || [],
    resource,
  };
}

function buildSignal({
  source,
  category,
  level,
  confidence,
  actions,
  matchedTextHash,
  userId = "local-user",
}) {
  return {
    id: makeId("safety"),
    userId,
    source,
    category,
    level,
    matchedTextHash,
    confidence,
    actionTaken: actions,
    createdAt: new Date().toISOString(),
  };
}

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `fnv1a:${(hash >>> 0).toString(16)}`;
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
