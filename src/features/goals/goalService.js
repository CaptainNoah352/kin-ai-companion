export function createGoal({ title, why = "", nextStep = "", mode = "goal_tracking" } = {}) {
  const now = new Date().toISOString();
  return {
    id: makeId("goal"),
    title: clean(title) || "Untitled goal",
    why: clean(why),
    nextStep: clean(nextStep) || "Choose one tiny next step.",
    mode,
    status: "active",
    missedCount: 0,
    recoveryNotes: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function markGoalDone(goal) {
  const now = new Date().toISOString();
  return {
    ...goal,
    status: "done",
    completedAt: now,
    updatedAt: now,
  };
}

export function markGoalMissed(goal, reason = "") {
  const now = new Date().toISOString();
  return {
    ...goal,
    status: "active",
    missedCount: Number(goal?.missedCount || 0) + 1,
    lastMissedAt: now,
    updatedAt: now,
    recoveryNotes: [
      {
        id: makeId("recovery"),
        type: "missed",
        note: clean(reason),
        createdAt: now,
      },
      ...(Array.isArray(goal?.recoveryNotes) ? goal.recoveryNotes : []),
    ],
  };
}

export function recoverGoal(goal, nextStep = "") {
  const now = new Date().toISOString();
  const cleanedStep = clean(nextStep);
  return {
    ...goal,
    status: "active",
    nextStep: cleanedStep || goal?.nextStep || "Pick a smaller next step.",
    lastRecoveredAt: now,
    updatedAt: now,
    recoveryNotes: [
      {
        id: makeId("recovery"),
        type: "recovery",
        note: cleanedStep || "Goal recovered with a smaller next step.",
        createdAt: now,
      },
      ...(Array.isArray(goal?.recoveryNotes) ? goal.recoveryNotes : []),
    ],
  };
}

export function activeGoals(goals = []) {
  return asArray(goals).filter((goal) => goal?.status !== "done" && goal?.status !== "archived");
}

export function completedGoals(goals = []) {
  return asArray(goals).filter((goal) => goal?.status === "done");
}

export function goalStats(goals = []) {
  const safeGoals = asArray(goals);
  const active = activeGoals(safeGoals);
  const completed = completedGoals(safeGoals);
  const missed = safeGoals.reduce((total, goal) => total + Number(goal?.missedCount || 0), 0);
  return {
    activeCount: active.length,
    completedCount: completed.length,
    missedCount: missed,
    recoveryCount: safeGoals.reduce(
      (total, goal) => total + (Array.isArray(goal?.recoveryNotes) ? goal.recoveryNotes.filter((note) => note.type === "recovery").length : 0),
      0,
    ),
  };
}

export function buildNoShameRecoveryCopy(goal) {
  const label = goal?.title ? `"${goal.title}"` : "this goal";
  return `No shame. Missing ${label} is information, not a character verdict. Make the next step smaller and restart from there.`;
}

function clean(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
