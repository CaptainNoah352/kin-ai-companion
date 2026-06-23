const dbName = "kin-trusted-vault-unlock";
const storeName = "trustedVaultUnlock";
const recordId = "default";
const version = 1;
const algorithm = "AES-GCM";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function createDefaultTrustedVaultUnlock(status) {
  return {
    enabled: Boolean(status?.enabled),
    createdAt: status?.createdAt || "",
    updatedAt: status?.updatedAt || "",
    error: status?.error || "",
  };
}

export async function rememberTrustedVaultUnlock(passcode, googleSession = {}, options = {}) {
  validatePasscode(passcode);
  const store = options.store || createIndexedDbStore();
  const cryptoApi = getCrypto();
  const key = await cryptoApi.subtle.generateKey({ name: algorithm, length: 256 }, false, ["encrypt", "decrypt"]);
  const iv = randomBase64(12);
  const encrypted = await cryptoApi.subtle.encrypt({ name: algorithm, iv: base64ToBytes(iv) }, key, encoder.encode(passcode));
  const now = new Date().toISOString();
  const existing = await store.get(recordId);
  const record = {
    id: recordId,
    version,
    algorithm,
    iv,
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    key,
    googleSub: googleSession?.sub || "",
    googleEmail: googleSession?.email || "",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await store.set(record);
  return redactTrustedVaultUnlock(record);
}

export async function readTrustedVaultPasscode(googleSession = {}, options = {}) {
  const store = options.store || createIndexedDbStore();
  const record = await store.get(recordId);
  if (!record) return null;
  validateRecord(record);
  if (!sessionMatches(record, googleSession)) {
    await store.delete(recordId);
    throw new Error("Remembered vault unlock belonged to a different Google account.");
  }

  try {
    const decrypted = await getCrypto().subtle.decrypt(
      { name: algorithm, iv: base64ToBytes(record.iv) },
      record.key,
      base64ToBytes(record.ciphertext),
    );
    return decoder.decode(decrypted);
  } catch {
    await store.delete(recordId);
    throw new Error("Remembered vault unlock is stale. Enter the vault passcode once.");
  }
}

export async function getTrustedVaultUnlockStatus(options = {}) {
  try {
    const store = options.store || createIndexedDbStore();
    const record = await store.get(recordId);
    return redactTrustedVaultUnlock(record);
  } catch (error) {
    return createDefaultTrustedVaultUnlock({ error: error.message || "Trusted unlock status could not be read." });
  }
}

export async function forgetTrustedVaultUnlock(options = {}) {
  const store = options.store || createIndexedDbStore();
  await store.delete(recordId);
  return createDefaultTrustedVaultUnlock();
}

export function redactTrustedVaultUnlock(recordOrStatus) {
  if (!recordOrStatus) return createDefaultTrustedVaultUnlock();
  return createDefaultTrustedVaultUnlock({
    enabled: true,
    createdAt: recordOrStatus.createdAt,
    updatedAt: recordOrStatus.updatedAt,
  });
}

export function createMemoryTrustedVaultStore(initialRecord = null) {
  const records = new Map();
  if (initialRecord) records.set(recordId, initialRecord);
  return {
    async get(id) {
      return records.get(id) || null;
    },
    async set(record) {
      records.set(record.id || recordId, record);
    },
    async delete(id) {
      records.delete(id);
    },
  };
}

function createIndexedDbStore() {
  return {
    async get(id) {
      const db = await openDb();
      return requestToPromise(db.transaction(storeName, "readonly").objectStore(storeName).get(id));
    },
    async set(record) {
      const db = await openDb();
      return requestToPromise(db.transaction(storeName, "readwrite").objectStore(storeName).put(record));
    },
    async delete(id) {
      const db = await openDb();
      return requestToPromise(db.transaction(storeName, "readwrite").objectStore(storeName).delete(id));
    },
  };
}

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is required to remember the vault on this device."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Trusted vault database could not be opened."));
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Trusted vault database request failed."));
  });
}

function validatePasscode(passcode) {
  if (typeof passcode !== "string" || passcode.length < 8) {
    throw new Error("Use a vault passcode with at least 8 characters.");
  }
}

function validateRecord(record) {
  if (
    record.version !== version ||
    record.algorithm !== algorithm ||
    !record.iv ||
    !record.ciphertext ||
    !record.key
  ) {
    throw new Error("Remembered vault unlock is not valid.");
  }
}

function sessionMatches(record, googleSession = {}) {
  if (record.googleSub && googleSession?.sub) return record.googleSub === googleSession.sub;
  if (record.googleEmail && googleSession?.email) return record.googleEmail === googleSession.email;
  return true;
}

function randomBase64(length) {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytesToBase64(bytes);
}

function getCrypto() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("Web Crypto is required to remember the vault on this device.");
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
