import test from "node:test";
import assert from "node:assert/strict";
import { buildCoachChatPayload } from "../src/features/aiCoach/chatPayload.js";

test("coach chat payload includes sanitized memory when personalization is enabled", () => {
  const payload = buildCoachChatPayload({
    messages: [{ role: "user", content: "I want help slowing down." }],
    mood: "Anxious",
    latestCheckIn: { stressScore: 7 },
    memory: {
      aboutMe: "I like direct support.",
      supportStyle: "One question at a time.",
      secretLocalOnly: "do not send",
      summaries: [
        {
          id: "local-id",
          text: "Recent conversation focused on work stress and sleep.",
          createdAt: "2026-06-22T12:00:00.000Z",
        },
      ],
    },
    region: "US",
    consent: { allowPersonalization: true },
    supportModes: ["procrastination", "emotional_support"],
    manualChatMode: "Support",
    suggestedChatMode: "Unblock",
    activeAppSpace: "adhd",
    bridgeContext: { sharedSignals: { latestMood: "Ashamed" } },
  });

  assert.equal(payload.memory.supportStyle, "One question at a time.");
  assert.equal(payload.memory.secretLocalOnly, undefined);
  assert.equal(payload.memory.summaries[0].id, undefined);
  assert.deepEqual(payload.supportModes, ["procrastination", "emotional_support"]);
  assert.equal(payload.manualChatMode, "Support");
  assert.equal(payload.suggestedChatMode, "Unblock");
  assert.equal(payload.activeAppSpace, "adhd");
  assert.deepEqual(payload.bridgeContext, { sharedSignals: { latestMood: "Ashamed" } });
});

test("coach chat payload excludes memory when personalization is disabled", () => {
  const payload = buildCoachChatPayload({
    messages: [{ role: "user", content: "I want help slowing down." }],
    mood: "Anxious",
    latestCheckIn: null,
    memory: {
      aboutMe: "private profile",
      summaries: [{ text: "private summary", createdAt: "2026-06-22T12:00:00.000Z" }],
    },
    region: "US",
    consent: { allowPersonalization: false },
  });

  assert.equal(payload.memory, null);
});
