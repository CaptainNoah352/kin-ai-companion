import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  createAppLock,
  isInCooldown,
  recordFailedUnlock,
  redactAppLockForExport,
  verifyAppLockPasscode,
} from "../src/features/privacy/appLockService.js";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
  });
}

test("app lock verifier accepts the correct passcode", async () => {
  const appLock = await createAppLock("correct-passcode", { iterations: 1000 });

  assert.equal(await verifyAppLockPasscode("correct-passcode", appLock), true);
});

test("app lock verifier rejects the wrong passcode", async () => {
  const appLock = await createAppLock("correct-passcode", { iterations: 1000 });

  assert.equal(await verifyAppLockPasscode("wrong-passcode", appLock), false);
});

test("app lock redaction never exports verifier internals", async () => {
  const appLock = await createAppLock("correct-passcode", { iterations: 1000 });
  const redacted = redactAppLockForExport(appLock);

  assert.equal(redacted.enabled, true);
  assert.equal(redacted.hasVerifier, true);
  assert.equal("salt" in redacted, false);
  assert.equal("verifier" in redacted, false);
});

test("app lock enters cooldown after five failed attempts", () => {
  let appLock = { enabled: true };
  for (let index = 0; index < 5; index += 1) {
    appLock = recordFailedUnlock(appLock, 1000);
  }

  assert.equal(isInCooldown(appLock, 1001), true);
});

test("app lock falls back to local API when crypto subtle is unavailable", async () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const originalFetch = globalThis.fetch;

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      getRandomValues: (bytes) => webcrypto.getRandomValues(bytes),
    },
  });

  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    const verifier = Buffer.from(`${body.passcode}:${body.salt}:${body.iterations}`).toString("base64");
    if (url === "/api/app-lock/derive") {
      return new Response(JSON.stringify({ verifier }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url === "/api/app-lock/verify") {
      return new Response(JSON.stringify({ ok: verifier === body.verifier }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "unexpected test URL" }), { status: 404 });
  };

  try {
    const appLock = await createAppLock("fallback-passcode", { iterations: 1000 });
    assert.equal(appLock.enabled, true);
    assert.equal(await verifyAppLockPasscode("fallback-passcode", appLock), true);
    assert.equal(await verifyAppLockPasscode("wrong-passcode", appLock), false);
  } finally {
    if (cryptoDescriptor) {
      Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
    } else {
      delete globalThis.crypto;
    }
    globalThis.fetch = originalFetch;
  }
});

test("hosted app lock does not call local API when crypto subtle is unavailable", async () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const originalFetch = globalThis.fetch;
  const previousMode = globalThis.__KIN_HOSTING_MODE__;
  let fetchCalled = false;

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      getRandomValues: (bytes) => webcrypto.getRandomValues(bytes),
    },
  });

  globalThis.__KIN_HOSTING_MODE__ = "github-pages";
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({ error: "unexpected API call" }), { status: 500 });
  };

  try {
    await assert.rejects(
      () => createAppLock("hosted-passcode", { iterations: 1000 }),
      /Web Crypto is required for app lock on the hosted app/,
    );
    assert.equal(fetchCalled, false);
  } finally {
    if (cryptoDescriptor) {
      Object.defineProperty(globalThis, "crypto", cryptoDescriptor);
    } else {
      delete globalThis.crypto;
    }
    globalThis.fetch = originalFetch;
    if (previousMode === undefined) delete globalThis.__KIN_HOSTING_MODE__;
    else globalThis.__KIN_HOSTING_MODE__ = previousMode;
  }
});
