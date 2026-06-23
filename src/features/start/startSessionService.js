export function createStartSession({ task, tinyStep = "", minutes = 5, bodyDoubling = false } = {}) {
  const now = new Date().toISOString();
  return {
    id: makeId("start"),
    task: clean(task) || "Unnamed task",
    tinyStep: clean(tinyStep) || "Open the task and do the first visible action.",
    minutes: normalizeMinutes(minutes),
    bodyDoubling: Boolean(bodyDoubling),
    status: "running",
    startedAt: now,
    updatedAt: now,
  };
}

export function completeStartSession(session) {
  const now = new Date().toISOString();
  return {
    ...session,
    status: "done",
    completedAt: now,
    updatedAt: now,
  };
}

export function markStartSessionStuck(session, smallerStep = "") {
  const now = new Date().toISOString();
  return {
    ...session,
    status: "stuck",
    smallerStep: clean(smallerStep) || "Shrink the task until it can be started in under one minute.",
    updatedAt: now,
  };
}

export function summarizeStartSessions(sessions = []) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  return {
    total: safeSessions.length,
    done: safeSessions.filter((session) => session?.status === "done").length,
    stuck: safeSessions.filter((session) => session?.status === "stuck").length,
    running: safeSessions.filter((session) => session?.status === "running").length,
    bodyDoubling: safeSessions.filter((session) => session?.bodyDoubling).length,
  };
}

function normalizeMinutes(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 5;
  return Math.min(30, Math.max(1, Math.round(numeric)));
}

function clean(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
