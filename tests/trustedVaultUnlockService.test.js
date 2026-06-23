import test from "node:test";
import assert from "node:assert/strict";
import {
  createMemoryTrustedVaultStore,
  forgetTrustedVaultUnlock,
  getTrustedVaultUnlockStatus,
  readTrustedVaultPasscode,
  rememberTrustedVaultUnlock,
} from "../src/features/sync/trustedVaultUnlockService.js";

test("remembered vault unlock encrypts and decrypts the passcode", async () => {
  const store = createMemoryTrustedVaultStore();
  const passcode = "trusted-device-passcode";

  const status = await rememberTrustedVaultUnlock(passcode, { email: "user@example.com" }, { store });
  const restored = await readTrustedVaultPasscode({ email: "user@example.com" }, { store });

  assert.equal(status.enabled, true);
  assert.equal(restored, passcode);
});

test("remembered vault unlock record does not contain plaintext passcode", async () => {
  let rawRecord = null;
  const store = {
    async get() {
      return rawRecord;
    },
    async set(record) {
      rawRecord = record;
    },
    async delete() {
      rawRecord = null;
    },
  };
  const passcode = "plaintext-should-not-appear";

  await rememberTrustedVaultUnlock(passcode, { email: "user@example.com" }, { store });

  assert.equal(JSON.stringify(rawRecord).includes(passcode), false);
  assert.ok(rawRecord.ciphertext);
  assert.ok(rawRecord.key);
});

test("trusted vault unlock clears stale record on decrypt failure", async () => {
  const store = createMemoryTrustedVaultStore();
  await rememberTrustedVaultUnlock("trusted-device-passcode", { email: "user@example.com" }, { store });
  const record = await store.get("default");
  await store.set({ ...record, ciphertext: "not-valid-ciphertext" });

  await assert.rejects(() => readTrustedVaultPasscode({ email: "user@example.com" }, { store }), /stale|valid/i);
  const status = await getTrustedVaultUnlockStatus({ store });
  assert.equal(status.enabled, false);
});

test("trusted vault unlock can be forgotten", async () => {
  const store = createMemoryTrustedVaultStore();
  await rememberTrustedVaultUnlock("trusted-device-passcode", { email: "user@example.com" }, { store });
  await forgetTrustedVaultUnlock({ store });

  const status = await getTrustedVaultUnlockStatus({ store });
  assert.equal(status.enabled, false);
});

test("trusted vault unlock rejects a different Google account", async () => {
  const store = createMemoryTrustedVaultStore();
  await rememberTrustedVaultUnlock("trusted-device-passcode", { email: "user@example.com" }, { store });

  await assert.rejects(
    () => readTrustedVaultPasscode({ email: "other@example.com" }, { store }),
    /different Google account/i,
  );
  const status = await getTrustedVaultUnlockStatus({ store });
  assert.equal(status.enabled, false);
});
