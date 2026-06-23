import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNoShameRecoveryCopy,
  createGoal,
  markGoalMissed,
  recoverGoal,
} from "../src/features/goals/goalService.js";

test("missed goals stay active and use no-shame recovery", () => {
  const goal = createGoal({
    title: "Write one paragraph",
    nextStep: "Open the document",
  });

  const missed = markGoalMissed(goal);

  assert.equal(missed.status, "active");
  assert.equal(missed.missedCount, 1);
  assert.match(buildNoShameRecoveryCopy(missed), /No shame/);
});

test("goal recovery replaces the next step with a smaller step", () => {
  const goal = markGoalMissed(
    createGoal({
      title: "Clean the room",
      nextStep: "Clean everything",
    }),
  );

  const recovered = recoverGoal(goal, "Put one cup in the sink");

  assert.equal(recovered.status, "active");
  assert.equal(recovered.nextStep, "Put one cup in the sink");
  assert.equal(recovered.recoveryNotes[0].type, "recovery");
});
