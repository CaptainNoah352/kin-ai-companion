import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVaultPayload,
  createDefaultDriveSync,
  createVaultContentSignature,
  detectVaultConflict,
  redactUserOpenRouter,
} from "../src/features/sync/vaultDataService.js";
import { storageKeys } from "../src/lib/storage.js";

test("vault payload excludes local-only sync and encrypted vault metadata", () => {
  const payload = buildVaultPayload({
    kinData: {
      [storageKeys.messages]: [{ role: "user", content: "hello" }],
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
});
