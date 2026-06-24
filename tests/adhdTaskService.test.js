import test from "node:test";
import assert from "node:assert/strict";
import {
  addSubtask,
  addTask,
  bulkUpdateTasks,
  createDefaultAdhdTasks,
  exportTasksAsCsv,
  exportTasksAsIcs,
  exportTasksAsMarkdown,
  moveTask,
  normalizeBreakdownResponse,
  setTaskCompleted,
  summarizeAdhdTasks,
} from "../src/features/adhdTasks/adhdTaskService.js";

test("ADHD tasks support nested creation and completion", () => {
  let state = createDefaultAdhdTasks();
  state = addTask(state, {
    title: "Clean kitchen",
    category: "home",
    subtasks: [{ title: "Put one dish in sink" }, { title: "Wipe counter" }],
  });
  const rootId = state.tabs[0].taskIds[0];

  assert.equal(state.tasks[rootId].childIds.length, 2);

  state = setTaskCompleted(state, rootId, true);
  assert.equal(state.tasks[rootId].completed, true);
  assert.equal(state.tasks[state.tasks[rootId].childIds[0]].completed, true);
});

test("ADHD tasks support subtasks, reorder, and bulk updates", () => {
  let state = createDefaultAdhdTasks();
  state = addTask(state, { title: "First", estimateMinutes: 10 });
  state = addTask(state, { title: "Second", estimateMinutes: 20 });
  const [firstId, secondId] = state.tabs[0].taskIds;

  state = addSubtask(state, firstId, { title: "Tiny first" });
  state = moveTask(state, secondId, "up");
  assert.deepEqual(state.tabs[0].taskIds, [secondId, firstId]);

  state = bulkUpdateTasks(state, "clear-estimates");
  assert.equal(state.tasks[firstId].estimateMinutes, null);
  assert.equal(state.tasks[secondId].estimateMinutes, null);
});

test("ADHD task exports include nested data", () => {
  let state = createDefaultAdhdTasks();
  state = addTask(state, {
    title: "File taxes",
    priority: "high",
    estimateMinutes: 45,
    subtasks: [{ title: "Find W2" }],
  });

  assert.match(exportTasksAsMarkdown(state), /- \[ \] File taxes/);
  assert.match(exportTasksAsMarkdown(state), /  - \[ \] Find W2/);
  assert.match(exportTasksAsCsv(state, { target: "todoist" }), /File taxes/);
  assert.match(exportTasksAsIcs(state), /BEGIN:VTODO/);
  assert.match(exportTasksAsIcs(state, { asEvents: true }), /BEGIN:VEVENT/);
});

test("ADHD task breakdown normalization rejects invalid JSON and summarizes", () => {
  const task = normalizeBreakdownResponse(
    '{"title":"Pack bag","category":"errands","estimateMinutes":20,"priority":"normal","subtasks":[{"title":"Find keys"}]}',
  );

  assert.equal(task.title, "Pack bag");
  assert.equal(task.subtasks?.length, 1);

  let state = createDefaultAdhdTasks();
  state = addTask(state, task);
  assert.equal(summarizeAdhdTasks(state).open, 2);
  assert.throws(() => normalizeBreakdownResponse("not json"), /valid JSON/);
});
