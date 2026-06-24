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

const pronounValues = new Set(pronounOptions.map((option) => option.value));
const genderIdentityValues = new Set(genderIdentityOptions.map((option) => option.value));

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

export function isStartupProfileComplete(profile = {}) {
  return Boolean(profile?.setupCompletedAt && typeof profile?.displayName === "string" && profile.displayName.trim());
}

export function isStartupConsentComplete(consent = {}) {
  return Boolean(consent?.acceptedTerms && consent?.acceptedPrivacyPolicy && consent?.aiDisclosureAccepted);
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

function resolveIdentityValue(value, customValue) {
  if (value === "custom") return customValue.trim();
  if (value === "prefer_not_to_say") return "";
  if (value === "ask_me") return "Ask me each time";
  return value || "";
}

function normalizeStoredIdentityValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
