export const vaultCryptoDefaults = {
  version: 1,
  algorithm: "AES-GCM",
  kdf: "PBKDF2-SHA256",
  iterations: 180000,
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function createEncryptedVault(payload, passcode, options = {}) {
  validatePasscode(passcode);
  const cryptoApi = getCrypto();
  const salt = randomBase64(options.saltBytes || 16);
  const iv = randomBase64(options.ivBytes || 12);
  const iterations = options.iterations || vaultCryptoDefaults.iterations;
  const key = await deriveAesKey(passcode, salt, iterations);
  const plaintext = JSON.stringify(payload);
  const encrypted = await cryptoApi.subtle.encrypt(
    {
      name: vaultCryptoDefaults.algorithm,
      iv: base64ToBytes(iv),
    },
    key,
    encoder.encode(plaintext),
  );

  return {
    version: vaultCryptoDefaults.version,
    app: "Kin",
    encryptedAt: new Date().toISOString(),
    crypto: {
      algorithm: vaultCryptoDefaults.algorithm,
      kdf: vaultCryptoDefaults.kdf,
      iterations,
      salt,
      iv,
    },
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function openEncryptedVault(envelope, passcode) {
  validatePasscode(passcode);
  validateEnvelope(envelope);
  const key = await deriveAesKey(passcode, envelope.crypto.salt, envelope.crypto.iterations);

  try {
    const decrypted = await getCrypto().subtle.decrypt(
      {
        name: envelope.crypto.algorithm,
        iv: base64ToBytes(envelope.crypto.iv),
      },
      key,
      base64ToBytes(envelope.ciphertext),
    );
    return JSON.parse(decoder.decode(decrypted));
  } catch {
    throw new Error("Vault passcode did not unlock this Kin backup.");
  }
}

export function hasPlaintextLeak(envelope, values = []) {
  const serialized = JSON.stringify(envelope);
  return values.some((value) => typeof value === "string" && value && serialized.includes(value));
}

function validatePasscode(passcode) {
  if (typeof passcode !== "string" || passcode.length < 8) {
    throw new Error("Use a vault passcode with at least 8 characters.");
  }
}

function validateEnvelope(envelope) {
  if (
    !envelope ||
    envelope.version !== vaultCryptoDefaults.version ||
    envelope.crypto?.algorithm !== vaultCryptoDefaults.algorithm ||
    envelope.crypto?.kdf !== vaultCryptoDefaults.kdf ||
    !envelope.crypto?.salt ||
    !envelope.crypto?.iv ||
    !envelope.ciphertext
  ) {
    throw new Error("This is not a valid Kin encrypted vault.");
  }
}

async function deriveAesKey(passcode, salt, iterations) {
  const cryptoApi = getCrypto();
  const material = await cryptoApi.subtle.importKey("raw", encoder.encode(passcode), "PBKDF2", false, ["deriveKey"]);
  return cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(salt),
      iterations,
    },
    material,
    {
      name: vaultCryptoDefaults.algorithm,
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

function randomBase64(length) {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytesToBase64(bytes);
}

function getCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("Web Crypto is required for encrypted Kin vaults.");
  }
  return globalThis.crypto;
}

function bytesToBase64(bytes) {
  if (typeof btoa === "function") {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(value) {
  if (typeof atob === "function") {
    const binary = atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return Uint8Array.from(Buffer.from(value, "base64"));
}
