import test from "node:test";
import assert from "node:assert/strict";
import { taskBreakdown } from "../server.mjs";

test("task breakdown rejects demo mode without leaking provider secrets", async () => {
  const previousOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const previousOpenRouterModel = process.env.OPENROUTER_MODEL;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousOpenAiModel = process.env.OPENAI_MODEL;

  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;

  try {
    await assert.rejects(
      () => taskBreakdown({ task: "Clean the kitchen", spiciness: 4 }),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.match(error.message, /real AI provider/i);
        assert.equal(String(error.message).includes("OPENROUTER_API_KEY"), false);
        return true;
      },
    );
  } finally {
    if (previousOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousOpenRouterKey;
    if (previousOpenRouterModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = previousOpenRouterModel;
    if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenAiKey;
    if (previousOpenAiModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousOpenAiModel;
  }
});
