import test from "node:test";
import assert from "node:assert/strict";
import { chatReply, classifySafetyWithBackup } from "../server.mjs";

test("normal server chat defaults to Claude Haiku", async () => {
  const env = snapshotEnv();
  const previousFetch = globalThis.fetch;
  const requests = [];

  setOpenRouterEnv();
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    return jsonResponse(
      isSafetyRequest(body)
        ? JSON.stringify({ category: "none", level: "none", confidence: 0 })
        : "A small next step is to choose one visible action.",
    );
  };

  try {
    const reply = await chatReply({
      messages: [{ role: "user", content: "Hello, I want to talk for a minute." }],
      region: "US",
    });

    assert.match(reply.content, /small next step/i);
    assert.equal(requests[0].model, "google/gemini-3.1-flash-lite");
    assert.equal(requests[1].model, "anthropic/claude-haiku-4.5");
  } finally {
    restoreEnv(env);
    globalThis.fetch = previousFetch;
  }
});

test("deep emotional support uses Claude Sonnet after non-crisis safety checks", async () => {
  const env = snapshotEnv();
  const previousFetch = globalThis.fetch;
  const requests = [];

  setOpenRouterEnv();
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    return jsonResponse(
      isSafetyRequest(body)
        ? JSON.stringify({ category: "none", level: "none", confidence: 0 })
        : "That sounds heavy. Let us slow it down and choose one support step.",
    );
  };

  try {
    await chatReply({
      messages: [{ role: "user", content: "I feel depressed and worthless, but I am safe and want support." }],
      region: "US",
      supportModes: ["emotional_support"],
    });

    assert.equal(requests[0].model, "google/gemini-3.1-flash-lite");
    assert.equal(requests[1].model, "anthropic/claude-sonnet-4.5");
  } finally {
    restoreEnv(env);
    globalThis.fetch = previousFetch;
  }
});

test("crisis chat returns Safety Router response without calling OpenRouter", async () => {
  const env = snapshotEnv();
  const previousFetch = globalThis.fetch;
  let fetchCalls = 0;

  setOpenRouterEnv();
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse("should not be called");
  };

  try {
    const reply = await chatReply({
      messages: [{ role: "user", content: "I want to kill myself." }],
      region: "US",
    });

    assert.equal(reply.blocked, true);
    assert.equal(fetchCalls, 0);
  } finally {
    restoreEnv(env);
    globalThis.fetch = previousFetch;
  }
});

test("safety backup can escalate ambiguous non-pausing text", async () => {
  const env = snapshotEnv();
  const previousFetch = globalThis.fetch;

  setOpenRouterEnv();
  globalThis.fetch = async () =>
    jsonResponse(JSON.stringify({ category: "self_harm_intent", level: "high", confidence: 0.82 }));

  try {
    const signal = await classifySafetyWithBackup("I may not be safe later and I do not trust myself.", {
      source: "ai_chat",
    });

    assert.equal(signal.level, "high");
    assert.equal(signal.category, "self_harm_intent");
    assert.equal(signal.backupClassifier.model, "google/gemini-3.1-flash-lite");
  } finally {
    restoreEnv(env);
    globalThis.fetch = previousFetch;
  }
});

test("safety backup cannot downgrade deterministic pausing results", async () => {
  const env = snapshotEnv();
  const previousFetch = globalThis.fetch;
  let fetchCalls = 0;

  setOpenRouterEnv();
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return jsonResponse(JSON.stringify({ category: "none", level: "none", confidence: 0 }));
  };

  try {
    const signal = await classifySafetyWithBackup("I don't want to live.", { source: "ai_chat" });

    assert.equal(signal.level, "moderate");
    assert.equal(signal.category, "self_harm_ideation");
    assert.equal(fetchCalls, 0);
  } finally {
    restoreEnv(env);
    globalThis.fetch = previousFetch;
  }
});

function isSafetyRequest(body) {
  return String(body.messages?.[0]?.content || "").includes("Classify mental-health safety risk");
}

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
  delete process.env.OPENROUTER_SAFETY_BACKUP_MODEL;
  delete process.env.OPENROUTER_DEEP_SUPPORT_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
}

function snapshotEnv() {
  return {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_TASK_MODEL: process.env.OPENROUTER_TASK_MODEL,
    OPENROUTER_SAFETY_BACKUP_MODEL: process.env.OPENROUTER_SAFETY_BACKUP_MODEL,
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
