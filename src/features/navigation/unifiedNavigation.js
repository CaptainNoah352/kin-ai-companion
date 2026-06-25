export const primaryTabIds = ["Home", "Coach", "Journal", "Tools", "Review", "Progress"];
export const utilityTabIds = ["Profile", "Check In", "Memory", "Safety", "Privacy"];
export const validToolViews = ["exercises", "tasks", "goals", "start"];

export const legacyToolTabToView = {
  Tasks: "tasks",
  Goals: "goals",
  Start: "start",
};

export function normalizeUnifiedTabId(tabId) {
  if (tabId === "Chat") return "Coach";
  if (Object.prototype.hasOwnProperty.call(legacyToolTabToView, tabId)) return "Tools";
  if (primaryTabIds.includes(tabId) || utilityTabIds.includes(tabId)) return tabId;
  return "Home";
}

export function normalizeToolView(toolView, legacyTabId = "") {
  if (Object.prototype.hasOwnProperty.call(legacyToolTabToView, legacyTabId)) {
    return legacyToolTabToView[legacyTabId];
  }
  return validToolViews.includes(toolView) ? toolView : "exercises";
}

export function deriveUnifiedNavigationState({ activeTab = "", activeToolView = "" } = {}) {
  return {
    activeTab: normalizeUnifiedTabId(activeTab),
    activeToolView: normalizeToolView(activeToolView, activeTab),
  };
}

export function isValidUnifiedTabId(tabId) {
  return primaryTabIds.includes(tabId) || utilityTabIds.includes(tabId);
}
