import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const renderConfig = readFileSync(new URL("../render.yaml", import.meta.url), "utf8");

test("Render blueprint runs the Kin API with the expected health check", () => {
  assert.match(renderConfig, /type:\s*web/);
  assert.match(renderConfig, /runtime:\s*node/);
  assert.match(renderConfig, /buildCommand:\s*npm ci/);
  assert.match(renderConfig, /startCommand:\s*npm run server/);
  assert.match(renderConfig, /healthCheckPath:\s*\/api\/health/);
  assert.match(renderConfig, /KIN_SERVER_HOST[\s\S]*?value:\s*0\.0\.0\.0/);
});

test("Render blueprint does not commit the OpenRouter API key", () => {
  assert.equal(renderConfig.includes("sk-or-"), false);
  assert.match(renderConfig, /OPENROUTER_API_KEY[\s\S]*?sync:\s*false/);
});

test("Render blueprint pins OpenRouter role models without secrets", () => {
  assert.match(renderConfig, /OPENROUTER_MODEL[\s\S]*?value:\s*google\/gemini-3\.1-flash-lite/);
  assert.match(renderConfig, /OPENROUTER_TASK_MODEL[\s\S]*?value:\s*google\/gemini-3\.1-flash-lite/);
  assert.match(renderConfig, /OPENROUTER_SAFETY_BACKUP_MODEL[\s\S]*?value:\s*google\/gemini-3\.1-flash-lite/);
  assert.match(renderConfig, /OPENROUTER_DEEP_SUPPORT_MODEL[\s\S]*?value:\s*openai\/gpt-5\.4-mini/);
  assert.match(renderConfig, /OPENROUTER_GOAL_MODEL[\s\S]*?value:\s*google\/gemini-3\.1-flash-lite/);
  assert.match(renderConfig, /OPENROUTER_SUMMARY_MODEL[\s\S]*?value:\s*google\/gemini-3\.1-flash-lite/);
  assert.match(renderConfig, /OPENROUTER_INSIGHT_MODEL[\s\S]*?value:\s*google\/gemini-3\.1-flash-lite/);
});
