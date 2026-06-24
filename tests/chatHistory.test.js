import test from "node:test";
import assert from "node:assert/strict";
import { chatStarterContent, normalizeChatHistory, starterMessages } from "../src/features/aiCoach/chatHistory.js";

test("starter message stays display-only and is removed from persisted chat history", () => {
  const oldStoredHistory = [
    starterMessages[0],
    { role: "user", content: "I need help getting started." },
    { role: "assistant", content: "Choose one visible action and do it for one minute." },
  ];

  assert.deepEqual(normalizeChatHistory(oldStoredHistory), [
    { role: "user", content: "I need help getting started." },
    { role: "assistant", content: "Choose one visible action and do it for one minute." },
  ]);
});

test("normal chat history is left unchanged", () => {
  const history = [
    { role: "user", content: "hello" },
    { role: "assistant", content: chatStarterContent },
  ];

  assert.equal(normalizeChatHistory(history), history);
});
