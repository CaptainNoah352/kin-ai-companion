import test from "node:test";
import assert from "node:assert/strict";
import {
  addMemorySummary,
  AI_MEMORY_SUMMARY_LIMIT,
  buildConversationSummary,
  createDefaultMemory,
  makeMemorySummary,
  MEMORY_SUMMARY_LIMIT,
  sanitizeMemoryForAi,
} from "../src/features/memory/memoryService.js";

test("default memory normalizes missing fields", () => {
  const memory = createDefaultMemory({ supportStyle: "Be direct" });

  assert.equal(memory.aboutMe, "");
  assert.equal(memory.supportStyle, "Be direct");
  assert.equal(memory.importantContext, "");
  assert.deepEqual(memory.summaries, []);
});

test("conversation summary uses recent user messages only", () => {
  const summary = buildConversationSummary([
    { role: "assistant", content: "Hi" },
    { role: "user", content: "I felt stressed today.\nThere was a lot going on." },
    { role: "user", content: "I want help slowing down." },
  ]);

  assert.match(summary, /I felt stressed today\. There was a lot going on\./);
  assert.match(summary, /I want help slowing down\./);
  assert.doesNotMatch(summary, /Hi/);
});

test("memory summary rejects blank notes", () => {
  assert.equal(makeMemorySummary("   "), null);
});

test("memory summary rejects notes that are too short to be useful", () => {
  assert.equal(makeMemorySummary("hi"), null);
});

test("saved conversation summaries are capped with newest first", () => {
  let memory = createDefaultMemory();
  for (let index = 1; index <= MEMORY_SUMMARY_LIMIT + 2; index += 1) {
    memory = addMemorySummary(memory, `Useful memory note ${index} with enough detail.`);
  }

  assert.equal(memory.summaries.length, MEMORY_SUMMARY_LIMIT);
  assert.equal(memory.summaries[0].text, `Useful memory note ${MEMORY_SUMMARY_LIMIT + 2} with enough detail.`);
  assert.equal(memory.summaries.at(-1).text, "Useful memory note 3 with enough detail.");
});

test("AI memory payload is concise and excludes local-only metadata", () => {
  let memory = createDefaultMemory({
    aboutMe: "I like calm support.",
    supportStyle: "Ask one question at a time.",
    importantContext: "Long work days are stressful.",
    localOnly: "do not send",
  });
  for (let index = 1; index <= AI_MEMORY_SUMMARY_LIMIT + 2; index += 1) {
    memory = addMemorySummary(memory, `Memory summary ${index} with enough detail for continuity.`);
  }

  const sanitized = sanitizeMemoryForAi(memory);

  assert.equal(sanitized.supportStyle, "Ask one question at a time.");
  assert.equal(sanitized.summaries.length, AI_MEMORY_SUMMARY_LIMIT);
  assert.equal(sanitized.localOnly, undefined);
  assert.equal(sanitized.summaries[0].id, undefined);
});
