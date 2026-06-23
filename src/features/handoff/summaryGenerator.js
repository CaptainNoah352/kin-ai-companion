import { filterCheckInsByDays } from "../progress/trendUtils.js";

export function generateHandoffSummary({ checkIns = [], completedModules = [], safetySignals = [], carePlan }, days = 7) {
  const range = filterCheckInsByDays(checkIns, days);
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: makeId("summary"),
    userId: "local-user",
    dateRangeStart: start,
    dateRangeEnd: new Date().toISOString(),
    goals: carePlan?.goals?.map((goal) => goal.userLanguage || goal.title) || [],
    symptomTrends: buildTrendLines(range),
    completedModules: completedModules
      .filter((item) => new Date(item.completedAt).getTime() >= new Date(start).getTime())
      .map((item) => item.title),
    currentStressors: range.map((item) => item.stressor).filter(Boolean).slice(-5),
    safetyConcerns: safetySignals
      .filter((item) => item.level !== "none")
      .map((item) => `${item.level}: ${item.category}`)
      .slice(0, 5),
    userNotes:
      "AI-generated summary for user review. The user should remove any section they do not want to share.",
    generatedAt: new Date().toISOString(),
  };
}

function buildTrendLines(checkIns) {
  if (!checkIns.length) return ["No check-ins in this date range."];
  const latest = [...checkIns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  return [
    `Latest mood score: ${latest.moodScore}/10.`,
    `Latest anxiety score: ${latest.anxietyScore}/10.`,
    `Latest stress score: ${latest.stressScore}/10.`,
    `Latest sleep quality: ${latest.sleepQuality}/10.`,
  ];
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
