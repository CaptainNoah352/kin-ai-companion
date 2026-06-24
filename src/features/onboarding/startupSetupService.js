export const pronounOptions = [
  { value: "she/her", label: "She/her" },
  { value: "he/him", label: "He/him" },
  { value: "they/them", label: "They/them" },
  { value: "she/they", label: "She/they" },
  { value: "he/they", label: "He/they" },
  { value: "ask_me", label: "Ask me each time" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "custom", label: "Custom" },
];

export const genderIdentityOptions = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Nonbinary" },
  { value: "trans_woman", label: "Trans woman" },
  { value: "trans_man", label: "Trans man" },
  { value: "genderfluid", label: "Genderfluid" },
  { value: "agender", label: "Agender" },
  { value: "questioning", label: "Questioning" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "custom", label: "Custom" },
];

export const goalOptions = ["anxiety", "low_mood", "stress", "sleep", "relationships", "self_esteem"];

export const supportStyleOptions = [
  { value: "gentle", label: "Gentle" },
  { value: "direct", label: "Direct" },
  { value: "structured", label: "Structured" },
  { value: "encouraging", label: "Encouraging" },
  { value: "simple", label: "Simple and concise" },
];

const pronounValues = new Set(pronounOptions.map((option) => option.value));
const genderIdentityValues = new Set(genderIdentityOptions.map((option) => option.value));

export function getStartupStepIds({
  needsPasscodeSetup = false,
  needsProfileSetup = false,
  needsConsentSetup = false,
} = {}) {
  return [
    needsPasscodeSetup ? "passcode" : null,
    needsProfileSetup ? "profile" : null,
    needsConsentSetup ? "boundaries" : null,
    needsConsentSetup ? "consent" : null,
  ].filter(Boolean);
}

export function createStartupDraft({ profile = {}, consent = {} } = {}) {
  const pronouns = normalizeStoredIdentityValue(profile.pronouns);
  const genderIdentity = normalizeStoredIdentityValue(profile.genderIdentity);

  return {
    displayName: profile.displayName || profile.name || "",
    pronouns: pronouns && pronounValues.has(pronouns) ? pronouns : pronouns ? "custom" : "prefer_not_to_say",
    customPronouns: pronouns && !pronounValues.has(pronouns) ? pronouns : "",
    genderIdentity:
      genderIdentity && genderIdentityValues.has(genderIdentity)
        ? genderIdentity
        : genderIdentity
          ? "custom"
          : "prefer_not_to_say",
    customGenderIdentity: genderIdentity && !genderIdentityValues.has(genderIdentity) ? genderIdentity : "",
    identityNotes: profile.identityNotes || "",
    ageRange: profile.ageRange || "18_24",
    region: profile.region || "US",
    language: profile.language || "English",
    supportStyle: profile.supportStyle || "gentle",
    goals: Array.isArray(profile.startupGoals) && profile.startupGoals.length ? profile.startupGoals : ["stress"],
    acceptedTerms: Boolean(consent.acceptedTerms),
    acceptedPrivacyPolicy: Boolean(consent.acceptedPrivacyPolicy),
    aiDisclosureAccepted: Boolean(consent.aiDisclosureAccepted),
    allowPersonalization: consent.allowPersonalization !== false,
    allowAnalytics: Boolean(consent.allowAnalytics),
    allowModelTraining: Boolean(consent.allowModelTraining),
    allowCrisisContactUse: Boolean(consent.allowCrisisContactUse),
    accessibilityPreferences: {
      reduceMotion: Boolean(profile.accessibilityPreferences?.reduceMotion),
      largeText: Boolean(profile.accessibilityPreferences?.largeText),
      highContrast: Boolean(profile.accessibilityPreferences?.highContrast),
      screenReaderOptimized: Boolean(profile.accessibilityPreferences?.screenReaderOptimized),
      simpleLanguage: Boolean(profile.accessibilityPreferences?.simpleLanguage),
    },
  };
}

export function normalizeStartupProfile(profile = {}, now = new Date().toISOString()) {
  const normalizedProfile = profile && typeof profile === "object" ? profile : {};
  const displayName =
    normalizeStoredIdentityValue(normalizedProfile.displayName) || normalizeStoredIdentityValue(normalizedProfile.name);
  if (!displayName) return normalizedProfile;

  const completedAt =
    normalizedProfile.setupCompletedAt || normalizedProfile.createdAt || normalizedProfile.updatedAt || now;

  return {
    ...normalizedProfile,
    id: normalizedProfile.id || "local-user",
    displayName,
    createdAt: normalizedProfile.createdAt || completedAt,
    updatedAt: normalizedProfile.updatedAt || completedAt,
    setupCompletedAt: completedAt,
  };
}

export function isStartupProfileComplete(profile = {}) {
  const normalizedProfile = normalizeStartupProfile(profile);
  return Boolean(
    normalizedProfile?.setupCompletedAt &&
      typeof normalizedProfile?.displayName === "string" &&
      normalizedProfile.displayName.trim(),
  );
}

export function isStartupConsentComplete(consent = {}) {
  return Boolean(consent?.acceptedTerms && consent?.acceptedPrivacyPolicy && consent?.aiDisclosureAccepted);
}

export function isStartupDraftReadyToFinish({
  draft = {},
  needsProfileSetup = false,
  needsConsentSetup = false,
} = {}) {
  const profileReady = Boolean(draft.displayName?.trim() && draft.region && draft.language?.trim());
  const consentReady = Boolean(draft.acceptedTerms && draft.acceptedPrivacyPolicy && draft.aiDisclosureAccepted);
  return (!needsProfileSetup || profileReady) && (!needsConsentSetup || consentReady);
}

export function getStartupPasscodeMode({ hasAppPasscode = false, hasExistingVault = false } = {}) {
  return hasAppPasscode || hasExistingVault ? "unlock" : "create";
}

export function buildStartupProfile({ draft, existingProfile = {}, now = new Date().toISOString() }) {
  const displayName = draft.displayName.trim();
  return {
    ...existingProfile,
    id: existingProfile.id || "local-user",
    displayName,
    pronouns: resolveIdentityValue(draft.pronouns, draft.customPronouns),
    genderIdentity: resolveIdentityValue(draft.genderIdentity, draft.customGenderIdentity),
    identityNotes: draft.identityNotes.trim(),
    ageRange: draft.ageRange,
    region: draft.region,
    language: draft.language,
    supportStyle: draft.supportStyle,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    startupGoals: draft.goals,
    accessibilityPreferences: draft.accessibilityPreferences,
    createdAt: existingProfile.createdAt || now,
    updatedAt: now,
    setupCompletedAt: existingProfile.setupCompletedAt || now,
  };
}

export function buildStartupConsent({ draft, existingConsent = {}, now = new Date().toISOString() }) {
  return {
    ...existingConsent,
    userId: existingConsent.userId || "local-user",
    acceptedTerms: Boolean(draft.acceptedTerms),
    acceptedPrivacyPolicy: Boolean(draft.acceptedPrivacyPolicy),
    aiDisclosureAccepted: Boolean(draft.aiDisclosureAccepted),
    allowPersonalization: Boolean(draft.allowPersonalization),
    allowAnalytics: Boolean(draft.allowAnalytics),
    allowModelTraining: Boolean(draft.allowModelTraining),
    allowCrisisContactUse: Boolean(draft.allowCrisisContactUse),
    createdAt: existingConsent.createdAt || now,
    updatedAt: now,
  };
}

export function buildCarePlanForGoals(goals = [], now = new Date().toISOString()) {
  return {
    id: crypto.randomUUID(),
    userId: "local-user",
    focusAreas: goals.map((goal) => ({
      id: crypto.randomUUID(),
      label: goal,
      severity: "unknown",
    })),
    goals: goals.map((goal) => ({
      id: crypto.randomUUID(),
      title: goal,
      userLanguage: goal.replaceAll("_", " "),
      status: "active",
      createdAt: now,
    })),
    recommendedModuleIds: initialModulesForGoals(goals),
    checkInFrequency: "daily",
    reassessmentFrequencyDays: 14,
    createdAt: now,
    updatedAt: now,
  };
}

function resolveIdentityValue(value, customValue) {
  if (value === "custom") return customValue.trim();
  if (value === "prefer_not_to_say") return "";
  if (value === "ask_me") return "Ask me each time";
  return value || "";
}

function normalizeStoredIdentityValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function initialModulesForGoals(goals) {
  const map = {
    anxiety: ["grounding-54321", "breathing-box"],
    low_mood: ["behavioral-activation", "self-compassion"],
    stress: ["grounding-54321", "rumination-worry-window"],
    sleep: ["sleep-reset"],
    relationships: ["communication-rehearsal"],
    self_esteem: ["self-compassion", "cbt-thought-record"],
  };
  return [...new Set(goals.flatMap((goal) => map[goal] || []))].slice(0, 4);
}
