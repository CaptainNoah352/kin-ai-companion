import { redactAppLockForExport } from "./appLockService.js";

export const dataCategories = [
  {
    key: "consent",
    label: "Consent settings",
    purpose: "Records app limitations, AI disclosure, privacy, analytics, and training choices.",
    required: true,
    userCanDelete: false,
    usedForAiPersonalization: false,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "checkIns",
    label: "Check-ins",
    purpose: "Tracks mood, stress, sleep, and support recommendations.",
    required: false,
    retentionDays: 365,
    userCanDelete: true,
    usedForAiPersonalization: true,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "messages",
    label: "Coach messages",
    purpose: "Keeps local conversation history for continuity.",
    required: false,
    userCanDelete: true,
    usedForAiPersonalization: true,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "goals",
    label: "Goals and tiny steps",
    purpose: "Stores active goals, next steps, missed-goal recovery notes, and completed goal history.",
    required: false,
    retentionDays: 365,
    userCanDelete: true,
    usedForAiPersonalization: true,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "startSessions",
    label: "Start sessions",
    purpose: "Stores 5-minute task starts, body-doubling sessions, and no-shame stuck/recovery notes.",
    required: false,
    retentionDays: 365,
    userCanDelete: true,
    usedForAiPersonalization: true,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "weeklyReviews",
    label: "Weekly reviews",
    purpose: "Stores weekly reflections, friction notes, and tiny next-week steps.",
    required: false,
    retentionDays: 365,
    userCanDelete: true,
    usedForAiPersonalization: true,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "journal",
    label: "Journal entries",
    purpose: "Stores private reflections in this browser.",
    required: false,
    userCanDelete: true,
    usedForAiPersonalization: true,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "safetySignals",
    label: "Safety signals",
    purpose: "Records risk routing actions without storing raw matched text.",
    required: true,
    retentionDays: 365,
    userCanDelete: true,
    usedForAiPersonalization: false,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "memory",
    label: "Personal memory",
    purpose: "Stores user-editable context and saved conversation summaries in this browser.",
    required: false,
    retentionDays: 365,
    userCanDelete: true,
    usedForAiPersonalization: true,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "appLock",
    label: "App lock",
    purpose: "Stores local screen-lock settings and a passcode verifier.",
    required: false,
    userCanDelete: true,
    usedForAiPersonalization: false,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "googleSession",
    label: "Google sign-in",
    purpose: "Keeps the signed-in Google profile on this browser so private app content can stay gated.",
    required: true,
    userCanDelete: true,
    usedForAiPersonalization: false,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "driveSync",
    label: "Drive sync metadata",
    purpose: "Tracks encrypted vault sync state, file id, and last sync times for this browser.",
    required: false,
    userCanDelete: true,
    usedForAiPersonalization: false,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
  {
    key: "encryptedVault",
    label: "Encrypted vault",
    purpose: "Stores encrypted Kin backup data for import or Google Drive sync. The vault passcode is not stored.",
    required: false,
    userCanDelete: true,
    usedForAiPersonalization: false,
    usedForAnalytics: false,
    usedForModelTraining: false,
  },
];

export function buildPrivacyExport(data) {
  const exportData = {
    ...data,
    appLock: data?.appLock ? redactAppLockForExport(data.appLock) : null,
    encryptedVault: redactEncryptedVaultForExport(data?.encryptedVault),
    sync: redactSyncForExport(data?.sync),
  };

  return {
    exportedAt: new Date().toISOString(),
    app: "Kin",
    exportVersion: 1,
    limitations:
      "This export is user-controlled and may include sensitive mental health support data from this browser.",
    data: exportData,
  };
}

function redactEncryptedVaultForExport(envelope) {
  if (!envelope) return null;
  return {
    present: true,
    version: envelope.version || null,
    app: envelope.app || "",
    encryptedAt: envelope.encryptedAt || "",
    algorithm: envelope.crypto?.algorithm || "",
    kdf: envelope.crypto?.kdf || "",
    iterations: envelope.crypto?.iterations || null,
    hasCiphertext: Boolean(envelope.ciphertext),
  };
}

function redactSyncForExport(sync) {
  if (!sync) return null;
  return {
    ...sync,
    userOpenRouter: sync.userOpenRouter
      ? {
          model: sync.userOpenRouter.model || "",
          appName: sync.userOpenRouter.appName || "",
          siteUrl: sync.userOpenRouter.siteUrl || "",
          updatedAt: sync.userOpenRouter.updatedAt || "",
          hasApiKey: Boolean(sync.userOpenRouter.hasApiKey || sync.userOpenRouter.apiKey),
        }
      : null,
  };
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
