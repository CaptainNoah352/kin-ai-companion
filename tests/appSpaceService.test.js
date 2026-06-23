import test from "node:test";
import assert from "node:assert/strict";
import {
  appSpaceIds,
  buildAppBridgeContext,
  buildAppSpacePromptContext,
  createDefaultAppSpaceTabs,
  normalizeAppSpace,
} from "../src/features/appSpaces/appSpaceService.js";

test("app space defaults normalize to Wellness and remember both tabs", () => {
  assert.equal(normalizeAppSpace("unknown"), appSpaceIds.wellness);
  assert.equal(normalizeAppSpace(appSpaceIds.adhd), appSpaceIds.adhd);
  assert.deepEqual(createDefaultAppSpaceTabs({ adhd: "Start" }), {
    wellness: "Home",
    adhd: "Start",
  });
});

test("bridge context summarizes the other app without dumping full chat history", () => {
  const context = buildAppBridgeContext({
    activeAppSpace: appSpaceIds.wellness,
    wellnessMessages: [{ role: "user", content: "I feel overwhelmed." }],
    adhdMessages: [
      { role: "user", content: "secret first message should not be copied in full" },
      {
        role: "user",
        content:
          "I am avoiding taxes because I feel ashamed and the pile is too big, so I keep scrolling instead of starting.",
        suggestedChatMode: "Unblock",
      },
    ],
    goals: [{ title: "File taxes", nextStep: "Open the folder", missedCount: 2 }],
    startSessions: [{ task: "Tax folder", status: "stuck", stuckCount: 1, tinyStep: "Find one form" }],
    checkIns: [{ primaryEmotion: "Ashamed", stressScore: 8, anxietyScore: 7 }],
  });

  const serialized = JSON.stringify(context);
  assert.equal(context.activeAppSpace, appSpaceIds.wellness);
  assert.equal(context.otherAppSpace, appSpaceIds.adhd);
  assert.equal(context.otherConversation.messageCount, 2);
  assert.equal(context.otherConversation.latestSuggestedMode, "Unblock");
  assert.equal(serialized.includes("secret first message should not be copied in full"), false);
  assert.equal(context.sharedSignals.missedGoals[0].title, "File taxes");
});

test("app space prompt context names the active space and bridge context", () => {
  const context = buildAppSpacePromptContext({
    activeAppSpace: appSpaceIds.adhd,
    bridgeContext: { sharedSignals: { latestMood: "Anxious" } },
  });

  assert.match(context, /ADHD \/ Focus/);
  assert.match(context, /executive-function/i);
  assert.match(context, /Bridge context JSON/);
});
