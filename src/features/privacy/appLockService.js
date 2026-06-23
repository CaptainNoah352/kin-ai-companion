export const appLockTimeoutOptions = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 30, label: "30 min" },
  { value: "session", label: "When browser closes" },
];

export const defaultAppLock = {
  enabled: false,
  timeoutMinutes: 10,
  algorithm: "PBKDF2-SHA256",
  iterations: 120000,
  salt: "",
  verifier: "",
  createdAt: "",
  updatedAt: "",
  failedAttempts: 0,
  lockedUntil: "",
};

const encoder = new TextEncoder();
const keyUsages = ["deriveBits"];

export function createDefaultAppLock(appLock) {
  return {
    ...defaultAppLock,
    ...(appLock || {}),
    enabled: Boolean(appLock?.enabled),
    timeoutMinutes: normalizeTimeout(appLock?.timeoutMinutes),
    iterations: Number(appLock?.iterations) || defaultAppLock.iterations,
    failedAttempts: Number(appLock?.failedAttempts) || 0,
  };
}

export async function createAppLock(passcode, options = {}) {
  validatePasscode(passcode);
  const now = new Date().toISOString();
  const salt = randomBase64(16);
  const iterations = options.iterations || defaultAppLock.iterations;
  const verifier = await deriveVerifier(passcode, salt, iterations);

  return {
    ...defaultAppLock,
    enabled: true,
    timeoutMinutes: normalizeTimeout(options.timeoutMinutes),
    algorithm: defaultAppLock.algorithm,
    iterations,
    salt,
    verifier,
    createdAt: now,
    updatedAt: now,
  };
}

export async function verifyAppLockPasscode(passcode, appLock) {
  const normalized = createDefaultAppLock(appLock);
  if (!normalized.enabled || !normalized.salt || !normalized.verifier) return false;
  if (!canUseWebCrypto()) {
    return verifyVerifierViaApi(passcode, normalized);
  }
  const verifier = await deriveVerifier(passcode, normalized.salt, normalized.iterations);
  return timingSafeEqual(verifier, normalized.verifier);
}

export function recordFailedUnlock(appLock, now = Date.now()) {
  const normalized = createDefaultAppLock(appLock);
  const failedAttempts = normalized.failedAttempts + 1;
  const next = {
    ...normalized,
    failedAttempts,
    updatedAt: new Date(now).toISOString(),
  };

  if (failedAttempts >= 5) {
    return {
      ...next,
      failedAttempts: 0,
      lockedUntil: new Date(now + 60000).toISOString(),
    };
  }

  return next;
}

export function recordSuccessfulUnlock(appLock) {
  return {
    ...createDefaultAppLock(appLock),
    failedAttempts: 0,
    lockedUntil: "",
    updatedAt: new Date().toISOString(),
  };
}

export function isInCooldown(appLock, now = Date.now()) {
  const lockedUntil = createDefaultAppLock(appLock).lockedUntil;
  return lockedUntil ? new Date(lockedUntil).getTime() > now : false;
}

export function redactAppLockForExport(appLock) {
  const normalized = createDefaultAppLock(appLock);
  return {
    enabled: normalized.enabled,
    timeoutMinutes: normalized.timeoutMinutes,
    algorithm: normalized.enabled ? normalized.algorithm : "",
    createdAt: normalized.createdAt || "",
    updatedAt: normalized.updatedAt || "",
    hasVerifier: Boolean(normalized.enabled && normalized.verifier && normalized.salt),
  };
}

function normalizeTimeout(timeoutMinutes) {
  if (timeoutMinutes === "session") return "session";
  const numeric = Number(timeoutMinutes);
  return [5, 10, 30].includes(numeric) ? numeric : defaultAppLock.timeoutMinutes;
}

function validatePasscode(passcode) {
  if (typeof passcode !== "string" || passcode.length < 6) {
    throw new Error("Passcode must be at least 6 characters.");
  }
}

async function deriveVerifier(passcode, salt, iterations) {
  if (!canUseWebCrypto()) {
    return deriveVerifierViaApi(passcode, salt, iterations);
  }

  const cryptoApi = getCrypto({ requireSubtle: true });
  const keyMaterial = await cryptoApi.subtle.importKey(
    "raw",
    encoder.encode(passcode),
    "PBKDF2",
    false,
    keyUsages,
  );
  const bits = await cryptoApi.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: base64ToBytes(salt),
      iterations,
    },
    keyMaterial,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function randomBase64(length) {
  const cryptoApi = getCrypto({ requireSubtle: false });
  const bytes = new Uint8Array(length);
  cryptoApi.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

function getCrypto({ requireSubtle = true } = {}) {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues || (requireSubtle && !cryptoApi.subtle)) {
    throw new Error("Web Crypto is required for app lock.");
  }
  return cryptoApi;
}

function canUseWebCrypto() {
  return Boolean(globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues);
}

async function deriveVerifierViaApi(passcode, salt, iterations) {
  const response = await fetch("/api/app-lock/derive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      passcode,
      salt,
      iterations,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.verifier) {
    throw new Error(data.error || "App lock verifier could not be created.");
  }
  return data.verifier;
}

async function verifyVerifierViaApi(passcode, appLock) {
  const response = await fetch("/api/app-lock/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      passcode,
      salt: appLock.salt,
      verifier: appLock.verifier,
      iterations: appLock.iterations,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "App lock passcode could not be verified.");
  }
  return Boolean(data.ok);
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

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}
