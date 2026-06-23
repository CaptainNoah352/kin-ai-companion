import test from "node:test";
import assert from "node:assert/strict";
import { createEncryptedVault, hasPlaintextLeak, openEncryptedVault } from "../src/features/sync/vaultCryptoService.js";

test("encrypted vault opens with the correct passcode", async () => {
  const payload = {
    kinData: {
      journal: [{ text: "private reflection" }],
    },
    userOpenRouter: {
      apiKey: "sk-or-v1-private-key",
      model: "openai/gpt-4o-mini",
    },
  };

  const envelope = await createEncryptedVault(payload, "correct horse passcode", { iterations: 1000 });
  const opened = await openEncryptedVault(envelope, "correct horse passcode");

  assert.deepEqual(opened, payload);
});

test("encrypted vault rejects the wrong passcode", async () => {
  const envelope = await createEncryptedVault({ kinData: { messages: [{ content: "hello" }] } }, "right passcode", {
    iterations: 1000,
  });

  await assert.rejects(() => openEncryptedVault(envelope, "wrong passcode"), /passcode/i);
});

test("encrypted vault envelope does not contain plaintext content or api keys", async () => {
  const privateNote = "my private therapy journal note";
  const privateKey = "sk-or-v1-private-openrouter-key";
  const envelope = await createEncryptedVault(
    {
      kinData: {
        journal: [{ text: privateNote }],
      },
      userOpenRouter: {
        apiKey: privateKey,
        model: "openai/gpt-4o-mini",
      },
    },
    "private vault passcode",
    { iterations: 1000 },
  );

  assert.equal(hasPlaintextLeak(envelope, [privateNote, privateKey]), false);
});
