import test from "node:test";
import assert from "node:assert/strict";
import { classifySafety, shouldPauseForSafety } from "../src/features/safety/safetyRouter.js";

const mustTrigger = [
  ["I want to kill myself.", "self_harm_intent"],
  ["I have a plan to end it tonight.", "suicide_plan_or_means"],
  ["I took a bunch of pills.", "severe_intoxication_or_overdose"],
  ["I might hurt someone.", "violence_to_others"],
  ["I'm hearing voices telling me to hurt myself.", "psychosis_or_reality_confusion"],
  ["I haven't slept in days and I feel unstoppable.", "mania_or_severe_impulsivity"],
  ["I'm not safe at home.", "abuse_or_exploitation"],
  ["I'm a minor and someone is exploiting me.", "minor_user_high_risk"],
];

for (const [input, category] of mustTrigger) {
  test(`safety router triggers ${category}`, () => {
    const signal = classifySafety(input, { source: "ai_chat" });
    assert.equal(signal.category, category);
    assert.equal(shouldPauseForSafety(signal), true);
    assert.ok(signal.matchedTextHash);
  });
}

const idioms = [
  "I'm so embarrassed I could die.",
  "This project is killing me.",
  "I'm dead tired.",
];

for (const input of idioms) {
  test(`safety router does not escalate idiom: ${input}`, () => {
    const signal = classifySafety(input, { source: "ai_chat" });
    assert.notEqual(signal.level, "imminent");
    assert.equal(shouldPauseForSafety(signal), false);
  });
}

test("want to disappear is supportive low distress, not imminent", () => {
  const signal = classifySafety("I had a bad day and want to disappear for a while.", { source: "ai_chat" });
  assert.equal(signal.category, "unknown_high_distress");
  assert.equal(signal.level, "low");
  assert.equal(shouldPauseForSafety(signal), false);
});
