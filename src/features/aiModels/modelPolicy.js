export const aiModelRoles = Object.freeze({
  normalCoach: "normalCoach",
  adhdTask: "adhdTask",
  goal: "goal",
  deepSupport: "deepSupport",
  summary: "summary",
  insight: "insight",
});

export const openRouterModelDefaults = Object.freeze({
  [aiModelRoles.normalCoach]: "anthropic/claude-haiku-4.5",
  [aiModelRoles.adhdTask]: "google/gemini-3.1-flash-lite",
  [aiModelRoles.goal]: "google/gemini-3.1-flash-lite",
  [aiModelRoles.deepSupport]: "anthropic/claude-sonnet-4.5",
  deepSupportFallback: "anthropic/claude-haiku-4.5",
  [aiModelRoles.summary]: "google/gemini-3.1-flash-lite",
  [aiModelRoles.insight]: "google/gemini-3.1-flash-lite",
});

export const openRouterModelEnvKeys = Object.freeze({
  [aiModelRoles.normalCoach]: "OPENROUTER_MODEL",
  [aiModelRoles.adhdTask]: "OPENROUTER_TASK_MODEL",
  [aiModelRoles.goal]: "OPENROUTER_GOAL_MODEL",
  [aiModelRoles.deepSupport]: "OPENROUTER_DEEP_SUPPORT_MODEL",
  [aiModelRoles.summary]: "OPENROUTER_SUMMARY_MODEL",
  [aiModelRoles.insight]: "OPENROUTER_INSIGHT_MODEL",
});

export function getOpenRouterModelForRole(role, env = {}) {
  const envKey = openRouterModelEnvKeys[role];
  const configured = envKey ? String(env?.[envKey] || "").trim() : "";
  return configured || openRouterModelDefaults[role] || openRouterModelDefaults[aiModelRoles.normalCoach];
}

export function buildOpenRouterModelDiagnostics(env = {}) {
  return {
    normalCoach: getOpenRouterModelForRole(aiModelRoles.normalCoach, env),
    adhdTask: getOpenRouterModelForRole(aiModelRoles.adhdTask, env),
    goal: getOpenRouterModelForRole(aiModelRoles.goal, env),
    deepSupport: getOpenRouterModelForRole(aiModelRoles.deepSupport, env),
    deepSupportFallback: openRouterModelDefaults.deepSupportFallback,
    summary: getOpenRouterModelForRole(aiModelRoles.summary, env),
    insight: getOpenRouterModelForRole(aiModelRoles.insight, env),
  };
}
