import { clearStoredKinData, removeStorage, storageKeys } from "../../lib/storage.js";

export function deleteJournalOnly() {
  removeStorage(storageKeys.journal);
}

export function deleteMentalHealthContent() {
  clearStoredKinData([
    storageKeys.messages,
    storageKeys.wellnessMessages,
    storageKeys.adhdMessages,
    storageKeys.goals,
    storageKeys.startSessions,
    storageKeys.weeklyReviews,
    storageKeys.checkIns,
    storageKeys.journal,
    storageKeys.completedModules,
    storageKeys.moduleDrafts,
    storageKeys.carePlan,
    storageKeys.safetySignals,
    storageKeys.safetyPlan,
    storageKeys.memory,
    storageKeys.encryptedVault,
  ]);
}

export function deleteAllKinData() {
  clearStoredKinData(Object.values(storageKeys));
}
