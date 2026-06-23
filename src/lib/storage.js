const PREFIX = "kin.v2.";

export const storageKeys = {
  consent: "consent",
  profile: "profile",
  messages: "messages",
  goals: "goals",
  startSessions: "startSessions",
  weeklyReviews: "weeklyReviews",
  checkIns: "checkIns",
  journal: "journal",
  completedModules: "completedModules",
  moduleDrafts: "moduleDrafts",
  carePlan: "carePlan",
  safetySignals: "safetySignals",
  safetyPlan: "safetyPlan",
  memory: "memory",
  appLock: "appLock",
  auditEvents: "auditEvents",
  installHintDismissed: "installHintDismissed",
  googleSession: "googleSession",
  driveSync: "driveSync",
  encryptedVault: "encryptedVault",
};

export function keyFor(key) {
  return key.startsWith(PREFIX) ? key : `${PREFIX}${key}`;
}

export function readStorage(key, fallback) {
  if (typeof localStorage === "undefined") return fallback;

  try {
    const value = localStorage.getItem(keyFor(key));
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  if (typeof localStorage === "undefined") return;
  if (value === undefined) {
    removeStorage(key);
    return;
  }
  localStorage.setItem(keyFor(key), JSON.stringify(value));
}

export function removeStorage(key) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(keyFor(key));
}

export function listStoredKinData() {
  if (typeof localStorage === "undefined") return {};

  return Object.fromEntries(
    Object.values(storageKeys).map((key) => [key, readStorage(key, null)]),
  );
}

export function clearStoredKinData(keys = Object.values(storageKeys)) {
  keys.forEach((key) => removeStorage(key));
}
