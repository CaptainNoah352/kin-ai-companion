import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVaultPayload,
  createDefaultDriveSync,
  createVaultContentSignature,
  detectVaultConflict,
  mergeUnsyncedLocalChatData,
  redactUserOpenRouter,
} from "../src/features/sync/vaultDataService.js";
import { storageKeys } from "../src/lib/storage.js";

test("vault payload excludes local-only sync and encrypted vault metadata", () => {
  const payload = buildVaultPayload({
    kinData: {
      [storageKeys.messages]: [{ role: "user", content: "hello" }],
      [storageKeys.wellnessMessages]: [{ role: "user", content: "wellness hello" }],
      [storageKeys.adhdMessages]: [{ role: "user", content: "adhd hello" }],
      [storageKeys.adhdTasks]: { tasks: { task1: { title: "private task" } } },
      [storageKeys.activeTab]: "Tasks",
      [storageKeys.pageScroll]: { "adhd:Tasks": 420 },
      [storageKeys.encryptedVault]: { ciphertext: "old encrypted blob" },
      [storageKeys.googleSession]: { email: "friend@example.com" },
      [storageKeys.driveSync]: { fileId: "drive-file-id" },
    },
    driveSync: {
      enabled: true,
      deviceId: "device-test",
    },
  });

  assert.equal(payload.deviceId, "device-test");
  assert.deepEqual(payload.kinData.messages, [{ role: "user", content: "hello" }]);
  assert.deepEqual(payload.kinData.wellnessMessages, [{ role: "user", content: "wellness hello" }]);
  assert.deepEqual(payload.kinData.adhdMessages, [{ role: "user", content: "adhd hello" }]);
  assert.deepEqual(payload.kinData.adhdTasks, { tasks: { task1: { title: "private task" } } });
  assert.equal(payload.kinData.activeTab, "Tasks");
  assert.equal(payload.kinData.pageScroll, undefined);
  assert.equal(payload.kinData.encryptedVault, undefined);
  assert.equal(payload.kinData.googleSession, undefined);
  assert.equal(payload.kinData.driveSync, undefined);
});

test("vault conflict detector handles local, remote, conflict, and synced states", () => {
  assert.equal(
    detectVaultConflict({
      localUpdatedAt: "2026-06-22T10:00:00.000Z",
      remoteModifiedAt: "2026-06-22T10:01:00.000Z",
      lastSyncedAt: "2026-06-22T09:59:00.000Z",
    }),
    "conflict",
  );
  assert.equal(
    detectVaultConflict({
      localUpdatedAt: "2026-06-22T09:58:00.000Z",
      remoteModifiedAt: "2026-06-22T10:01:00.000Z",
      lastSyncedAt: "2026-06-22T09:59:00.000Z",
    }),
    "remote-newer",
  );
  assert.equal(
    detectVaultConflict({
      localUpdatedAt: "2026-06-22T10:01:00.000Z",
      remoteModifiedAt: "2026-06-22T09:58:00.000Z",
      lastSyncedAt: "2026-06-22T09:59:00.000Z",
    }),
    "local-newer",
  );
  assert.equal(
    detectVaultConflict({
      localUpdatedAt: "2026-06-22T09:58:00.000Z",
      remoteModifiedAt: "2026-06-22T09:58:00.000Z",
      lastSyncedAt: "2026-06-22T09:59:00.000Z",
    }),
    "in-sync",
  );
});

test("redacted OpenRouter settings never include the api key", () => {
  const redacted = redactUserOpenRouter({
    apiKey: "sk-or-v1-private-key",
    model: "openai/gpt-4o-mini",
    appName: "Kin",
    siteUrl: "https://example.com",
  });

  assert.equal(redacted.hasApiKey, true);
  assert.equal(redacted.apiKey, undefined);
  assert.equal(JSON.stringify(redacted).includes("sk-or-v1-private-key"), false);
});

test("drive sync defaults enable near-instant sync with a safe interval", () => {
  const defaults = createDefaultDriveSync();
  assert.equal(defaults.enabled, false);
  assert.equal(defaults.autoSyncEnabled, true);
  assert.equal(defaults.autoSyncIntervalSeconds, 30);
  assert.ok(defaults.deviceId);

  const normalized = createDefaultDriveSync({ autoSyncEnabled: false, autoSyncIntervalSeconds: 999 });
  assert.equal(normalized.autoSyncEnabled, false);
  assert.equal(normalized.autoSyncIntervalSeconds, 30);
});

test("vault content signature excludes local-only metadata and changes with private content", () => {
  const first = createVaultContentSignature({
    kinData: {
      [storageKeys.messages]: [{ role: "user", content: "hello" }],
      [storageKeys.activeTab]: "Journal",
      [storageKeys.pageScroll]: { "wellness:Journal": 300 },
      [storageKeys.driveSync]: { status: "synced" },
      [storageKeys.googleSession]: { email: "friend@example.com" },
    },
    userOpenRouter: {
      apiKey: "sk-or-v1-private-key",
      model: "openai/gpt-4o-mini",
    },
  });
  const second = createVaultContentSignature({
    kinData: {
      [storageKeys.messages]: [{ role: "user", content: "changed" }],
      [storageKeys.activeTab]: "Journal",
      [storageKeys.pageScroll]: { "wellness:Journal": 900 },
      [storageKeys.driveSync]: { status: "error" },
      [storageKeys.googleSession]: { email: "friend@example.com" },
    },
    userOpenRouter: {
      apiKey: "sk-or-v1-private-key",
      model: "openai/gpt-4o-mini",
    },
  });

  assert.notEqual(first, second);
  assert.equal(first.includes("driveSync"), false);
  assert.equal(first.includes("googleSession"), false);
  assert.equal(first.includes("pageScroll"), false);
});

test("local vault restore preserves longer unsynced local chat histories", () => {
  const merged = mergeUnsyncedLocalChatData(
    {
      [storageKeys.wellnessMessages]: [{ role: "user", content: "older saved chat" }],
      [storageKeys.adhdMessages]: [{ role: "user", content: "saved adhd chat" }],
    },
    {
      [storageKeys.wellnessMessages]: [
        { role: "user", content: "older saved chat" },
        { role: "assistant", content: "new reply before force close" },
      ],
      [storageKeys.adhdMessages]: [],
    },
  );

  assert.deepEqual(merged[storageKeys.wellnessMessages], [
    { role: "user", content: "older saved chat" },
    { role: "assistant", content: "new reply before force close" },
  ]);
  assert.deepEqual(merged[storageKeys.adhdMessages], [{ role: "user", content: "saved adhd chat" }]);
  assert.deepEqual(merged[storageKeys.messages], [
    { role: "user", content: "older saved chat" },
    { role: "assistant", content: "new reply before force close" },
    { role: "user", content: "saved adhd chat" },
  ]);
});

test("local vault restore seeds unified coach messages from legacy histories", () => {
  const merged = mergeUnsyncedLocalChatData(
    {
      [storageKeys.wellnessMessages]: [{ role: "user", content: "saved wellness chat" }],
      [storageKeys.adhdMessages]: [{ role: "assistant", content: "saved focus chat" }],
    },
    {},
  );

  assert.deepEqual(merged[storageKeys.messages], [
    { role: "user", content: "saved wellness chat" },
    { role: "assistant", content: "saved focus chat" },
  ]);
});
