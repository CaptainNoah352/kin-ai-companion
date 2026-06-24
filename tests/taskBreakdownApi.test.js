import test from "node:test";
import assert from "node:assert/strict";
import { taskBreakdown } from "../server.mjs";
import { createBrowserTaskBreakdown, taskBreakdownOpenRouterModel } from "../src/features/adhdTasks/taskBreakdownClient.js";

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

test("server task breakdown uses Gemini Flash-Lite by default", async () => {
  const previousOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const previousOpenRouterModel = process.env.OPENROUTER_MODEL;
  const previousOpenRouterTaskModel = process.env.OPENROUTER_TASK_MODEL;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousOpenAiModel = process.env.OPENAI_MODEL;
  const previousFetch = globalThis.fetch;
  let requestBody = null;

  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  delete process.env.OPENROUTER_MODEL;
  delete process.env.OPENROUTER_TASK_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Clean the kitchen",
                category: "home",
                estimateMinutes: 15,
                priority: "normal",
                subtasks: [],
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await taskBreakdown({ task: "Clean the kitchen", spiciness: 4 });

    assert.equal(requestBody.model, taskBreakdownOpenRouterModel);
  } finally {
    restoreEnv("OPENROUTER_API_KEY", previousOpenRouterKey);
    restoreEnv("OPENROUTER_MODEL", previousOpenRouterModel);
    restoreEnv("OPENROUTER_TASK_MODEL", previousOpenRouterTaskModel);
    restoreEnv("OPENAI_API_KEY", previousOpenAiKey);
    restoreEnv("OPENAI_MODEL", previousOpenAiModel);
    globalThis.fetch = previousFetch;
  }
});

test("browser task breakdown uses Gemini Flash-Lite role default", async () => {
  const previousFetch = globalThis.fetch;
  let requestBody = null;

  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Reply to email",
                category: "work",
                estimateMinutes: 10,
                priority: "normal",
                subtasks: [],
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await createBrowserTaskBreakdown({
      task: "Reply to email",
      spiciness: 3,
      userOpenRouter: {
        apiKey: "test-user-key",
        model: "openai/gpt-5.2",
      },
    });

    assert.equal(requestBody.model, taskBreakdownOpenRouterModel);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

function restoreEnv(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
