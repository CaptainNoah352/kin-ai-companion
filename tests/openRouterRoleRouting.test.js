import test from "node:test";
import assert from "node:assert/strict";
import { chatReply } from "../server.mjs";

test("normal server chat defaults to Claude Haiku", async () => {
  const env = snapshotEnv();
  const previousFetch = globalThis.fetch;
  const requests = [];

  setOpenRouterEnv();
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    return jsonResponse("A small next step is to choose one visible action.");
  };

  try {
    const reply = await chatReply({
      messages: [{ role: "user", content: "Hello, I want to talk for a minute." }],
      region: "US",
    });

    assert.match(reply.content, /small next step/i);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].model, "anthropic/claude-haiku-4.5");
  } finally {
    restoreEnv(env);
    globalThis.fetch = previousFetch;
  }
});

test("deep emotional support uses Claude Sonnet", async () => {
  const env = snapshotEnv();
  const previousFetch = globalThis.fetch;
  const requests = [];

  setOpenRouterEnv();
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    return jsonResponse("That sounds heavy. Let us slow it down and choose one support step.");
  };

  try {
    await chatReply({
      messages: [{ role: "user", content: "I feel depressed and worthless, but I am safe and want support." }],
      region: "US",
      supportModes: ["emotional_support"],
    });

    assert.equal(requests.length, 1);
    assert.equal(requests[0].model, "anthropic/claude-sonnet-4.5");
  } finally {
    restoreEnv(env);
    globalThis.fetch = previousFetch;
  }
});

test("formerly safety-triggering chat is not intercepted before OpenRouter", async () => {
  const env = snapshotEnv();
  const previousFetch = globalThis.fetch;
  const requests = [];

  setOpenRouterEnv();
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return jsonResponse("I hear this is serious. Please consider human support while we choose one next step.");
  };

  try {
    const reply = await chatReply({
      messages: [{ role: "user", content: "I want to kill myself." }],
      region: "US",
    });

    assert.equal(reply.blocked, undefined);
    assert.equal(reply.safety, undefined);
    assert.equal(requests.length, 1);
  } finally {
    restoreEnv(env);
    globalThis.fetch = previousFetch;
  }
});

function jsonResponse(content) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: { content },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function setOpenRouterEnv() {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  delete process.env.OPENROUTER_MODEL;
  delete process.env.OPENROUTER_TASK_MODEL;
  delete process.env.OPENROUTER_DEEP_SUPPORT_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
}

function snapshotEnv() {
  return {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_TASK_MODEL: process.env.OPENROUTER_TASK_MODEL,
    OPENROUTER_DEEP_SUPPORT_MODEL: process.env.OPENROUTER_DEEP_SUPPORT_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  };
}

function restoreEnv(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
