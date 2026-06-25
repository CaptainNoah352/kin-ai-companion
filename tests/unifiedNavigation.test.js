import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveUnifiedNavigationState,
  normalizeToolView,
  normalizeUnifiedTabId,
} from "../src/features/navigation/unifiedNavigation.js";

test("unified navigation maps legacy top-level tabs to the new surfaces", () => {
  assert.equal(normalizeUnifiedTabId("Chat"), "Coach");
  assert.equal(normalizeUnifiedTabId("Tasks"), "Tools");
  assert.equal(normalizeUnifiedTabId("Goals"), "Tools");
  assert.equal(normalizeUnifiedTabId("Start"), "Tools");
  assert.equal(normalizeUnifiedTabId("Review"), "Review");
  assert.equal(normalizeUnifiedTabId("unknown"), "Home");
});

test("tool view normalization preserves explicit views and derives legacy tab views", () => {
  assert.equal(normalizeToolView("tasks"), "tasks");
  assert.equal(normalizeToolView("bogus"), "exercises");
  assert.equal(normalizeToolView("exercises", "Goals"), "goals");
  assert.equal(normalizeToolView("exercises", "Start"), "start");
});

test("unified navigation derives tab and tool view together", () => {
  assert.deepEqual(deriveUnifiedNavigationState({ activeTab: "Tasks", activeToolView: "exercises" }), {
    activeTab: "Tools",
    activeToolView: "tasks",
  });
  assert.deepEqual(deriveUnifiedNavigationState({ activeTab: "Chat", activeToolView: "goals" }), {
    activeTab: "Coach",
    activeToolView: "goals",
  });
});
