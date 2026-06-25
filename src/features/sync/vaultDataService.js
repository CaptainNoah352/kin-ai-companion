import { listStoredKinData, readStorage, storageKeys, writeStorage } from "../../lib/storage.js";
import { seedUnifiedCoachMessages } from "../aiCoach/coachHistoryMigration.js";

export const driveSyncDefaults = {
  enabled: false,
  autoSyncEnabled: true,
  autoSyncIntervalSeconds: 30,
  fileId: "",
  lastSyncedAt: "",
  lastLocalSnapshotAt: "",
  lastRemoteModifiedAt: "",
  lastAutoSyncAt: "",
  lastAutoPushAt: "",
  lastAutoPullAt: "",
  lastSyncReason: "",
  deviceId: "",
  status: "not-configured",
  error: "",
};

export const defaultUserOpenRouter = {
  apiKey: "",
  model: "openai/gpt-4o-mini",
  appName: "Kin Mental Wellness Companion",
  siteUrl: "",
  updatedAt: "",
};

const localOnlyExportKeys = new Set([
  storageKeys.encryptedVault,
  storageKeys.googleSession,
  storageKeys.driveSync,
  storageKeys.pageScroll,
  storageKeys.safetySignals,
  storageKeys.safetyPlan,
]);

export function createDefaultDriveSync(sync) {
  return {
    ...driveSyncDefaults,
    ...(sync || {}),
    enabled: Boolean(sync?.enabled),
    autoSyncEnabled: sync?.autoSyncEnabled !== false,
    autoSyncIntervalSeconds: normalizeAutoSyncInterval(sync?.autoSyncIntervalSeconds),
    deviceId: sync?.deviceId || makeId("device"),
  };
}

export function createDefaultUserOpenRouter(settings) {
  return {
    ...defaultUserOpenRouter,
    ...(settings || {}),
    apiKey: typeof settings?.apiKey === "string" ? settings.apiKey : "",
    model: typeof settings?.model === "string" && settings.model ? settings.model : defaultUserOpenRouter.model,
    appName: typeof settings?.appName === "string" && settings.appName ? settings.appName : defaultUserOpenRouter.appName,
    siteUrl: typeof settings?.siteUrl === "string" ? settings.siteUrl : "",
    updatedAt: settings?.updatedAt || "",
  };
}

export function buildVaultPayload({ kinData = collectKinDataForVault(), userOpenRouter = defaultUserOpenRouter, driveSync } = {}) {
  const now = new Date().toISOString();
  const sync = createDefaultDriveSync(driveSync);
  return {
    version: 1,
    app: "Kin",
    updatedAt: now,
    deviceId: sync.deviceId,
    kinData: stripLocalOnlyData(kinData),
    userOpenRouter: createDefaultUserOpenRouter(userOpenRouter),
  };
}

export function collectKinDataForVault() {
  return stripLocalOnlyData(listStoredKinData());
}

export function restoreKinDataFromVault(kinData = {}) {
  Object.values(storageKeys).forEach((key) => {
    if (localOnlyExportKeys.has(key)) return;
    if (Object.prototype.hasOwnProperty.call(kinData, key)) {
      writeStorage(key, kinData[key]);
    }
  });
}

export function mergeUnsyncedLocalChatData(vaultKinData = {}, localKinData = {}) {
  const wellnessMessages = chooseLongerChatHistory(
    vaultKinData[storageKeys.wellnessMessages] ?? vaultKinData[storageKeys.messages],
    localKinData[storageKeys.wellnessMessages] ?? localKinData[storageKeys.messages],
  );
  const adhdMessages = chooseLongerChatHistory(
    vaultKinData[storageKeys.adhdMessages],
    localKinData[storageKeys.adhdMessages],
  );
  const messages = seedUnifiedCoachMessages({
    messages: chooseLongerChatHistory(vaultKinData[storageKeys.messages], localKinData[storageKeys.messages]),
    wellnessMessages,
    adhdMessages,
  });

  return {
    ...vaultKinData,
    [storageKeys.messages]: messages,
    [storageKeys.wellnessMessages]: wellnessMessages,
    [storageKeys.adhdMessages]: adhdMessages,
  };
}

export function readLocalEncryptedVault() {
  return readStorage(storageKeys.encryptedVault, null);
}

export function writeLocalEncryptedVault(envelope) {
  writeStorage(storageKeys.encryptedVault, envelope);
}

export function detectVaultConflict({ localUpdatedAt = "", lastSyncedAt = "", remoteModifiedAt = "" } = {}) {
  const localChanged = isAfter(localUpdatedAt, lastSyncedAt);
  const remoteChanged = isAfter(remoteModifiedAt, lastSyncedAt);
  if (localChanged && remoteChanged) return "conflict";
  if (remoteChanged) return "remote-newer";
  if (localChanged) return "local-newer";
  return "in-sync";
}

export function redactUserOpenRouter(settings) {
  const normalized = createDefaultUserOpenRouter(settings);
  return {
    model: normalized.model,
    appName: normalized.appName,
    siteUrl: normalized.siteUrl,
    updatedAt: normalized.updatedAt,
    hasApiKey: Boolean(normalized.apiKey),
  };
}

export function createVaultContentSignature({ kinData = {}, userOpenRouter = defaultUserOpenRouter } = {}) {
  return JSON.stringify({
    kinData: stripLocalOnlyData(kinData),
    userOpenRouter: createDefaultUserOpenRouter(userOpenRouter),
  });
}

function stripLocalOnlyData(data) {
  return Object.fromEntries(Object.entries(data || {}).filter(([key]) => !localOnlyExportKeys.has(key)));
}

function chooseLongerChatHistory(vaultMessages, localMessages) {
  const vaultValues = Array.isArray(vaultMessages) ? vaultMessages : [];
  const localValues = Array.isArray(localMessages) ? localMessages : [];
  return localValues.length > vaultValues.length ? localValues : vaultValues;
}

function isAfter(left, right) {
  if (!left) return false;
  if (!right) return true;
  return new Date(left).getTime() > new Date(right).getTime();
}

function normalizeAutoSyncInterval(value) {
  const numeric = Number(value);
  return [15, 30, 60, 120].includes(numeric) ? numeric : driveSyncDefaults.autoSyncIntervalSeconds;
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
