import test from "node:test";
import assert from "node:assert/strict";
import { buildPrivacyExport, dataCategories } from "../src/features/privacy/dataExport.js";
import { deleteAllKinData, deleteMentalHealthContent } from "../src/features/privacy/dataDeletion.js";
import { readStorage, storageKeys, writeStorage } from "../src/lib/storage.js";

test("privacy export is readable and versioned", () => {
  const exported = buildPrivacyExport({
    consent: { allowModelTraining: false },
    checkIns: [{ moodScore: 6 }],
    encryptedVault: {
      version: 1,
      app: "Kin",
      encryptedAt: "2026-06-22T10:00:00.000Z",
      crypto: {
        algorithm: "AES-GCM",
        kdf: "PBKDF2-SHA256",
        iterations: 180000,
        salt: "vault-salt",
      },
      ciphertext: "encrypted-private-content",
    },
    sync: {
      trustedVaultUnlock: {
        enabled: true,
        ciphertext: "trusted-unlock-ciphertext",
        key: "trusted-unlock-key",
        createdAt: "2026-06-22T10:00:00.000Z",
      },
      userOpenRouter: {
        apiKey: "sk-or-v1-export-should-not-leak",
        model: "openai/gpt-4o-mini",
      },
    },
    appLock: {
      enabled: true,
      timeoutMinutes: 10,
      salt: "secret-salt",
      verifier: "secret-verifier",
    },
  });

  assert.equal(exported.app, "Kin");
  assert.equal(exported.exportVersion, 1);
  assert.equal(exported.data.consent.allowModelTraining, false);
  assert.equal(exported.data.appLock.enabled, true);
  assert.equal(exported.data.appLock.salt, undefined);
  assert.equal(exported.data.appLock.verifier, undefined);
  assert.equal(exported.data.encryptedVault.present, true);
  assert.equal(exported.data.encryptedVault.ciphertext, undefined);
  assert.equal(exported.data.encryptedVault.salt, undefined);
  assert.equal(exported.data.sync.userOpenRouter.hasApiKey, true);
  assert.equal(exported.data.sync.trustedVaultUnlock.enabled, true);
  assert.equal(exported.data.sync.trustedVaultUnlock.ciphertext, undefined);
  assert.equal(exported.data.sync.trustedVaultUnlock.key, undefined);
  assert.equal(JSON.stringify(exported).includes("sk-or-v1-export-should-not-leak"), false);
  assert.equal(JSON.stringify(exported).includes("encrypted-private-content"), false);
  assert.equal(JSON.stringify(exported).includes("trusted-unlock-ciphertext"), false);
  assert.equal(JSON.stringify(exported).includes("trusted-unlock-key"), false);
  assert.match(exported.limitations, /sensitive mental health/i);
});

test("data map keeps model training off for sensitive categories", () => {
  const sensitive = dataCategories.filter((category) =>
    [
      "checkIns",
      "messages",
      "wellnessMessages",
      "adhdMessages",
      "adhdTasks",
      "goals",
      "startSessions",
      "weeklyReviews",
      "journal",
      "memory",
      "safetySignals",
      "appLock",
      "trustedVaultUnlock",
    ].includes(category.key),
  );
  assert.ok(sensitive.length >= 13);
  for (const category of sensitive) {
    assert.equal(category.usedForModelTraining, false);
  }
});

test("mental health deletion clears local content including memory", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };

  writeStorage(storageKeys.messages, [{ role: "user", content: "hello" }]);
  writeStorage(storageKeys.wellnessMessages, [{ role: "user", content: "wellness hello" }]);
  writeStorage(storageKeys.adhdMessages, [{ role: "user", content: "adhd hello" }]);
  writeStorage(storageKeys.adhdTasks, { tasks: { private: { title: "private task list" } } });
  writeStorage(storageKeys.goals, [{ title: "private goal" }]);
  writeStorage(storageKeys.startSessions, [{ task: "private task" }]);
  writeStorage(storageKeys.weeklyReviews, [{ wins: "private review" }]);
  writeStorage(storageKeys.journal, [{ text: "private note" }]);
  writeStorage(storageKeys.memory, { aboutMe: "personal context", summaries: [] });
  writeStorage(storageKeys.encryptedVault, { ciphertext: "stale encrypted mental health content" });
  writeStorage(storageKeys.googleSession, { email: "friend@example.com" });
  writeStorage(storageKeys.driveSync, { fileId: "drive-file-id" });
  writeStorage(storageKeys.appLock, { enabled: true, verifier: "hash", salt: "salt" });
  writeStorage(storageKeys.consent, { allowModelTraining: false });

  deleteMentalHealthContent();

  assert.equal(readStorage(storageKeys.messages, null), null);
  assert.equal(readStorage(storageKeys.wellnessMessages, null), null);
  assert.equal(readStorage(storageKeys.adhdMessages, null), null);
  assert.equal(readStorage(storageKeys.adhdTasks, null), null);
  assert.equal(readStorage(storageKeys.goals, null), null);
  assert.equal(readStorage(storageKeys.startSessions, null), null);
  assert.equal(readStorage(storageKeys.weeklyReviews, null), null);
  assert.equal(readStorage(storageKeys.journal, null), null);
  assert.equal(readStorage(storageKeys.memory, null), null);
  assert.equal(readStorage(storageKeys.encryptedVault, null), null);
  assert.deepEqual(readStorage(storageKeys.googleSession, null), { email: "friend@example.com" });
  assert.deepEqual(readStorage(storageKeys.driveSync, null), { fileId: "drive-file-id" });
  assert.deepEqual(readStorage(storageKeys.appLock, null), { enabled: true, verifier: "hash", salt: "salt" });
  assert.deepEqual(readStorage(storageKeys.consent, null), { allowModelTraining: false });

  delete globalThis.localStorage;
});

test("delete all data clears app lock", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };

  writeStorage(storageKeys.appLock, { enabled: true, verifier: "hash", salt: "salt" });
  writeStorage(storageKeys.messages, [{ role: "user", content: "hello" }]);
  writeStorage(storageKeys.wellnessMessages, [{ role: "user", content: "wellness hello" }]);
  writeStorage(storageKeys.adhdMessages, [{ role: "user", content: "adhd hello" }]);
  writeStorage(storageKeys.memory, { aboutMe: "private profile", summaries: [] });
  writeStorage(storageKeys.installHintDismissed, true);
  writeStorage(storageKeys.activeTab, "Privacy");
  writeStorage(storageKeys.pageScroll, { "wellness:Privacy": 480 });
  writeStorage(storageKeys.googleSession, { email: "friend@example.com" });
  writeStorage(storageKeys.driveSync, { fileId: "drive-file-id" });
  writeStorage(storageKeys.encryptedVault, { ciphertext: "encrypted content" });

  deleteAllKinData();

  assert.equal(readStorage(storageKeys.appLock, null), null);
  assert.equal(readStorage(storageKeys.messages, null), null);
  assert.equal(readStorage(storageKeys.wellnessMessages, null), null);
  assert.equal(readStorage(storageKeys.adhdMessages, null), null);
  assert.equal(readStorage(storageKeys.memory, null), null);
  assert.equal(readStorage(storageKeys.installHintDismissed, null), null);
  assert.equal(readStorage(storageKeys.activeTab, null), null);
  assert.equal(readStorage(storageKeys.pageScroll, null), null);
  assert.equal(readStorage(storageKeys.googleSession, null), null);
  assert.equal(readStorage(storageKeys.driveSync, null), null);
  assert.equal(readStorage(storageKeys.encryptedVault, null), null);

  delete globalThis.localStorage;
});
