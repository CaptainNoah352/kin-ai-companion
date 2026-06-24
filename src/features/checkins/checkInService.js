import { recommendModules } from "../aiCoach/aiCoachService.js";

export function createCheckIn(input) {
  const note = String(input.note || "").trim();

  return {
    id: makeId("checkin"),
    userId: "local-user",
    moodScore: Number(input.moodScore),
    anxietyScore: Number(input.anxietyScore),
    stressScore: Number(input.stressScore),
    energyScore: Number(input.energyScore),
    sleepQuality: Number(input.sleepQuality),
    sleepHours: input.sleepHours === "" ? undefined : Number(input.sleepHours),
    primaryEmotion: input.primaryEmotion || "",
    bodySensation: input.bodySensation || "",
    stressor: input.stressor || "",
    note,
    createdAt: new Date().toISOString(),
  };
}

export function getLatestCheckIn(checkIns = []) {
  return [...checkIns].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

export function getCheckInRecommendation(checkIn) {
  if (!checkIn) return { moduleIds: ["grounding-54321"], reason: "A quick grounding exercise is a gentle place to start." };

  const moduleIds = recommendModules({ latestCheckIn: checkIn });
  if (checkIn.anxietyScore >= 7) return { moduleIds, reason: "Anxiety is elevated, so calming tools are prioritized." };
  if (checkIn.stressScore >= 7) return { moduleIds, reason: "Stress is elevated, so the next step should be small and structured." };
  if (checkIn.sleepQuality <= 4) return { moduleIds, reason: "Sleep looked difficult, so sleep support is prioritized." };
  if (checkIn.moodScore <= 4) return { moduleIds, reason: "Mood is lower, so tiny values-based action may help." };
  return { moduleIds: moduleIds.length ? moduleIds : ["self-compassion"], reason: "A steady check-in is a good moment to reinforce what helps." };
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
