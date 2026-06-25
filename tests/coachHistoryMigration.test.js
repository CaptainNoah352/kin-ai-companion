import test from "node:test";
import assert from "node:assert/strict";
import { mergeCoachHistories, seedUnifiedCoachMessages } from "../src/features/aiCoach/coachHistoryMigration.js";

test("unified coach history keeps existing unified messages when present", () => {
  const messages = [{ role: "user", content: "current coach message" }];
  assert.deepEqual(
    seedUnifiedCoachMessages({
      messages,
      wellnessMessages: [{ role: "user", content: "old wellness" }],
      adhdMessages: [{ role: "user", content: "old focus" }],
    }),
    messages,
  );
});

test("unified coach history seeds from legacy histories when messages are empty", () => {
  assert.deepEqual(
    seedUnifiedCoachMessages({
      wellnessMessages: [{ role: "user", content: "old wellness" }],
      adhdMessages: [{ role: "assistant", content: "old focus" }],
    }),
    [
      { role: "user", content: "old wellness" },
      { role: "assistant", content: "old focus" },
    ],
  );
});

test("coach history merge removes duplicate role and content pairs", () => {
  assert.deepEqual(
    mergeCoachHistories(
      [{ role: "user", content: "same" }],
      [{ role: "user", content: "same" }, { role: "assistant", content: "different" }],
    ),
    [{ role: "user", content: "same" }, { role: "assistant", content: "different" }],
  );
});
