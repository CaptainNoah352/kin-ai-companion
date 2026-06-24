import test from "node:test";
import assert from "node:assert/strict";
import {
  aiModelRoles,
  buildOpenRouterModelDiagnostics,
  getOpenRouterModelForRole,
  openRouterModelDefaults,
} from "../src/features/aiModels/modelPolicy.js";

test("model policy defaults route Kin roles to the requested OpenRouter models", () => {
  assert.equal(getOpenRouterModelForRole(aiModelRoles.normalCoach), "anthropic/claude-haiku-4.5");
  assert.equal(getOpenRouterModelForRole(aiModelRoles.safetyBackup), "google/gemini-3.1-flash-lite");
  assert.equal(getOpenRouterModelForRole(aiModelRoles.adhdTask), "google/gemini-3.1-flash-lite");
  assert.equal(getOpenRouterModelForRole(aiModelRoles.goal), "google/gemini-3.1-flash-lite");
  assert.equal(getOpenRouterModelForRole(aiModelRoles.deepSupport), "anthropic/claude-sonnet-4.5");
  assert.equal(openRouterModelDefaults.deepSupportFallback, "anthropic/claude-haiku-4.5");
  assert.equal(getOpenRouterModelForRole(aiModelRoles.summary), "google/gemini-3.1-flash-lite");
  assert.equal(getOpenRouterModelForRole(aiModelRoles.insight), "google/gemini-3.1-flash-lite");
});

test("model policy accepts environment overrides without changing other roles", () => {
  const diagnostics = buildOpenRouterModelDiagnostics({
    OPENROUTER_MODEL: "custom/coach",
    OPENROUTER_DEEP_SUPPORT_MODEL: "custom/deep",
  });

  assert.equal(diagnostics.normalCoach, "custom/coach");
  assert.equal(diagnostics.deepSupport, "custom/deep");
  assert.equal(diagnostics.adhdTask, "google/gemini-3.1-flash-lite");
  assert.equal(diagnostics.deepSupportFallback, "anthropic/claude-haiku-4.5");
});
