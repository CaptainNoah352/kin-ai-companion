export const appSpaceIds = {
  wellness: "wellness",
  adhd: "adhd",
};

export const appSpaceMeta = {
  [appSpaceIds.wellness]: {
    id: appSpaceIds.wellness,
    label: "Wellness",
    chatTitle: "Wellness Chat",
    shortLabel: "Wellness",
  },
  [appSpaceIds.adhd]: {
    id: appSpaceIds.adhd,
    label: "ADHD / Focus",
    chatTitle: "ADHD Coach",
    shortLabel: "ADHD",
  },
};

export function normalizeAppSpace(value) {
  return value === appSpaceIds.adhd ? appSpaceIds.adhd : appSpaceIds.wellness;
}

export function createDefaultAppSpaceTabs(tabs) {
  return {
    [appSpaceIds.wellness]: "Home",
    [appSpaceIds.adhd]: "Home",
    ...(tabs || {}),
  };
}

export function buildAppBridgeContext({
  activeAppSpace = appSpaceIds.wellness,
  wellnessMessages = [],
  adhdMessages = [],
  adhdTasks,
  goals = [],
  startSessions = [],
  weeklyReviews = [],
  checkIns = [],
  memory,
} = {}) {
  const active = normalizeAppSpace(activeAppSpace);
  const other = active === appSpaceIds.wellness ? appSpaceIds.adhd : appSpaceIds.wellness;
  const activeMessages = active === appSpaceIds.wellness ? wellnessMessages : adhdMessages;
  const otherMessages = other === appSpaceIds.wellness ? wellnessMessages : adhdMessages;

  const activeGoals = asArray(goals).filter((goal) => goal?.status !== "done").slice(0, 3);
  const missedGoals = asArray(goals).filter((goal) => Number(goal?.missedCount || 0) > 0).slice(0, 3);
  const taskSummary = summarizeTaskState(adhdTasks);
  const recentStart = asArray(startSessions).slice(0, 3).map((session) => ({
    task: summarizeText(session?.task || ""),
    status: session?.status || "",
    stuckCount: Number(session?.stuckCount || 0),
    smallerStep: summarizeText(session?.smallerStep || session?.tinyStep || ""),
  }));
  const latestCheckIn = asArray(checkIns)[0] || null;
  const latestReview = asArray(weeklyReviews)[0] || null;

  return {
    activeAppSpace: active,
    activeAppLabel: appSpaceMeta[active].label,
    otherAppSpace: other,
    otherAppLabel: appSpaceMeta[other].label,
    activeConversation: summarizeConversation(activeMessages),
    otherConversation: summarizeConversation(otherMessages),
    sharedSignals: {
      latestMood: latestCheckIn?.primaryEmotion || "",
      stressScore: latestCheckIn?.stressScore ?? null,
      anxietyScore: latestCheckIn?.anxietyScore ?? null,
      activeGoals: activeGoals.map((goal) => ({
        title: summarizeText(goal?.title || ""),
        nextStep: summarizeText(goal?.nextStep || ""),
        mode: goal?.mode || "",
      })),
      missedGoals: missedGoals.map((goal) => ({
        title: summarizeText(goal?.title || ""),
        nextStep: summarizeText(goal?.nextStep || ""),
        missedCount: Number(goal?.missedCount || 0),
      })),
      adhdTasks: taskSummary,
      recentStart,
      latestReviewFocus: summarizeText(latestReview?.nextWeekFocus || latestReview?.friction || ""),
      memorySummaryCount: Array.isArray(memory?.summaries) ? memory.summaries.length : 0,
    },
  };
}

function summarizeTaskState(state) {
  if (!state || typeof state !== "object") return { open: 0, completed: 0, recentOpenTasks: [] };
  const tasks = Object.values(state.tasks || {});
  const topLevel = tasks.filter((task) => !task?.parentId);
  return {
    open: tasks.filter((task) => !task?.completed).length,
    completed: tasks.filter((task) => task?.completed).length,
    recentOpenTasks: topLevel
      .filter((task) => !task?.completed)
      .slice(0, 3)
      .map((task) => ({
        title: summarizeText(task?.title || ""),
        category: task?.category || "",
        priority: task?.priority || "",
      })),
  };
}

export function buildAppSpacePromptContext({ activeAppSpace = appSpaceIds.wellness, bridgeContext } = {}) {
  const active = normalizeAppSpace(activeAppSpace);
  const label = appSpaceMeta[active].label;
  const role =
    active === appSpaceIds.adhd
      ? "You are in Kin's ADHD / Focus app space. Prioritize executive-function support, task starts, planning, no-shame recovery, and focus scaffolding."
      : "You are in Kin's Wellness app space. Prioritize emotional support, grounding, journaling, coping tools, and reflective care.";

  return [
    `Active app space: ${label}.`,
    role,
    "Kin has two connected app spaces. Use the bridge context lightly so Wellness and ADHD support can coordinate without dumping raw history.",
    `Bridge context JSON: ${JSON.stringify(bridgeContext || {})}.`,
  ].join("\n");
}

function summarizeConversation(messages = []) {
  const safeMessages = asArray(messages);
  const latestUser = [...safeMessages].reverse().find((message) => message?.role === "user");
  const latestAssistant = [...safeMessages].reverse().find((message) => message?.role === "assistant");
  return {
    messageCount: safeMessages.length,
    latestUserTheme: summarizeText(latestUser?.content || ""),
    latestAssistantTheme: summarizeText(latestAssistant?.content || ""),
    latestSuggestedMode: latestAssistant?.suggestedChatMode || latestUser?.suggestedChatMode || "",
  };
}

function summarizeText(value = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= 140) return text;
  return `${text.slice(0, 137).trim()}...`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}
