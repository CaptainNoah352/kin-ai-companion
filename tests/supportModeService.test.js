import test from "node:test";
import assert from "node:assert/strict";
import {
  buildModeSuggestion,
  classifySupportModes,
  detectProcrastinationAsEmotionalAvoidance,
  supportModeIds,
} from "../src/features/supportModes/supportModeService.js";

test("classifies procrastination with shame as emotional avoidance", () => {
  const text = "I keep avoiding this task and I feel ashamed and overwhelmed.";
  const modes = classifySupportModes(text);

  assert.equal(detectProcrastinationAsEmotionalAvoidance(text), true);
  assert.equal(modes.includes(supportModeIds.procrastination), true);
  assert.equal(modes.includes(supportModeIds.emotionalSupport), true);

  const suggestion = buildModeSuggestion(text, { manualChatMode: "Support" });
  assert.equal(suggestion.suggestedChatMode, "Unblock");
  assert.equal(suggestion.emotionalAvoidance, true);
});

test("classifies distracted unable-to-start messages as focus plus task start", () => {
  const modes = classifySupportModes("I have ADHD, I am distracted, and I cannot start the email.");

  assert.equal(modes.includes(supportModeIds.adhdFocus), true);
  assert.equal(modes.includes(supportModeIds.taskStart), true);
});

test("classifies panic and overwhelm as calm support", () => {
  const suggestion = buildModeSuggestion("I am panicking and overwhelmed.", { manualChatMode: "Support" });

  assert.equal(suggestion.modes.includes(supportModeIds.grounding), true);
  assert.equal(suggestion.suggestedChatMode, "Calm");
});
