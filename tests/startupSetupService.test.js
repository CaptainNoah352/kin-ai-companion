import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCarePlanForGoals,
  buildStartupConsent,
  buildStartupProfile,
  createStartupDraft,
  genderIdentityOptions,
  getStartupPasscodeMode,
  getStartupStepIds,
  isStartupDraftReadyToFinish,
  isStartupConsentComplete,
  isStartupProfileComplete,
  normalizeStartupProfile,
  pronounOptions,
  supportStyleOptions,
} from "../src/features/onboarding/startupSetupService.js";

test("startup profile accepts restored legacy profiles with a chosen name", () => {
  assert.equal(isStartupProfileComplete({ displayName: "Sam" }), true);
  assert.equal(isStartupProfileComplete({ displayName: "  ", setupCompletedAt: "2026-06-24T10:00:00.000Z" }), false);
  assert.equal(isStartupProfileComplete({ displayName: "Sam", setupCompletedAt: "2026-06-24T10:00:00.000Z" }), true);
});

test("restored startup profiles are normalized without asking setup again", () => {
  const profile = normalizeStartupProfile(
    {
      id: "local-user",
      name: " Hunter ",
      pronouns: "they/them",
      createdAt: "2026-06-24T10:00:00.000Z",
    },
    "2026-06-24T11:00:00.000Z",
  );

  assert.equal(profile.displayName, "Hunter");
  assert.equal(profile.pronouns, "they/them");
  assert.equal(profile.createdAt, "2026-06-24T10:00:00.000Z");
  assert.equal(profile.setupCompletedAt, "2026-06-24T10:00:00.000Z");
  assert.equal(isStartupProfileComplete(profile), true);
});

test("startup consent requires the AI, terms, and privacy acknowledgements", () => {
  assert.equal(isStartupConsentComplete({ acceptedTerms: true, acceptedPrivacyPolicy: true }), false);
  assert.equal(
    isStartupConsentComplete({
      acceptedTerms: true,
      acceptedPrivacyPolicy: true,
      aiDisclosureAccepted: true,
    }),
    true,
  );
});

test("startup finish only requires active setup sections", () => {
  const profileDraft = createStartupDraft({
    profile: {
      displayName: "Hunter",
    },
  });

  assert.equal(
    isStartupDraftReadyToFinish({
      draft: profileDraft,
      needsProfileSetup: true,
      needsConsentSetup: false,
    }),
    true,
  );
  assert.equal(
    isStartupDraftReadyToFinish({
      draft: profileDraft,
      needsProfileSetup: true,
      needsConsentSetup: true,
    }),
    false,
  );
  assert.equal(
    isStartupDraftReadyToFinish({
      draft: {
        ...profileDraft,
        acceptedTerms: true,
        acceptedPrivacyPolicy: true,
        aiDisclosureAccepted: true,
      },
      needsProfileSetup: true,
      needsConsentSetup: true,
    }),
    true,
  );
});

test("startup passcode mode unlocks when an existing vault is known", () => {
  assert.equal(getStartupPasscodeMode({ hasAppPasscode: false, hasExistingVault: false }), "create");
  assert.equal(getStartupPasscodeMode({ hasAppPasscode: true, hasExistingVault: false }), "unlock");
  assert.equal(getStartupPasscodeMode({ hasAppPasscode: false, hasExistingVault: true }), "unlock");
});

test("startup steps keep vault setup active until parent setup state changes", () => {
  assert.deepEqual(
    getStartupStepIds({
      needsPasscodeSetup: true,
      needsProfileSetup: false,
      needsConsentSetup: false,
    }),
    ["passcode"],
  );
  assert.deepEqual(
    getStartupStepIds({
      needsPasscodeSetup: false,
      needsProfileSetup: true,
      needsConsentSetup: true,
    }),
    ["profile", "boundaries", "consent"],
  );
  assert.deepEqual(getStartupStepIds(), []);
});

test("startup profile stores inclusive identity fields without legal identity requirements", () => {
  const draft = createStartupDraft({
    profile: {
      id: "local-user",
      displayName: "  Hunter  ",
      pronouns: "xe/xem",
      genderIdentity: "trans_woman",
      identityNotes: "Use feminine language.",
    },
  });
  const profile = buildStartupProfile({
    draft: {
      ...draft,
      displayName: "  Hunter  ",
      pronouns: "custom",
      customPronouns: " xe/xem ",
      genderIdentity: "trans_woman",
      identityNotes: " Use feminine language. ",
      supportStyle: "structured",
      accessibilityPreferences: {
        reduceMotion: true,
        largeText: false,
        highContrast: true,
        screenReaderOptimized: false,
        simpleLanguage: true,
      },
    },
    existingProfile: { id: "local-user" },
    now: "2026-06-24T10:00:00.000Z",
  });

  assert.equal(profile.displayName, "Hunter");
  assert.equal(profile.pronouns, "xe/xem");
  assert.equal(profile.genderIdentity, "trans_woman");
  assert.equal(profile.identityNotes, "Use feminine language.");
  assert.equal(profile.supportStyle, "structured");
  assert.equal(profile.accessibilityPreferences.reduceMotion, true);
  assert.equal(profile.accessibilityPreferences.highContrast, true);
  assert.equal(profile.accessibilityPreferences.simpleLanguage, true);
  assert.equal(profile.setupCompletedAt, "2026-06-24T10:00:00.000Z");
  assert.equal(Object.hasOwn(profile, "legalName"), false);
  assert.equal(Object.hasOwn(profile, "sexAssignedAtBirth"), false);
  assert.equal(Object.hasOwn(profile, "deadname"), false);
});

test("profile edits preserve creation metadata and update identity fields", () => {
  const profile = buildStartupProfile({
    draft: {
      ...createStartupDraft({
        profile: {
          displayName: "Hunter",
          pronouns: "they/them",
          genderIdentity: "trans_man",
          ageRange: "25_34",
          region: "US",
          language: "English",
          setupCompletedAt: "2026-06-24T10:00:00.000Z",
        },
      }),
      displayName: "H",
      pronouns: "she/they",
      genderIdentity: "nonbinary",
      identityNotes: " Use neutral language. ",
      supportStyle: "direct",
    },
    existingProfile: {
      id: "local-user",
      createdAt: "2026-06-24T10:00:00.000Z",
      setupCompletedAt: "2026-06-24T10:00:00.000Z",
    },
    now: "2026-06-24T11:00:00.000Z",
  });

  assert.equal(profile.displayName, "H");
  assert.equal(profile.pronouns, "she/they");
  assert.equal(profile.genderIdentity, "nonbinary");
  assert.equal(profile.identityNotes, "Use neutral language.");
  assert.equal(profile.supportStyle, "direct");
  assert.equal(profile.createdAt, "2026-06-24T10:00:00.000Z");
  assert.equal(profile.updatedAt, "2026-06-24T11:00:00.000Z");
  assert.equal(profile.setupCompletedAt, "2026-06-24T10:00:00.000Z");
});

test("startup options include transgender-friendly choices and optional disclosure", () => {
  assert.ok(pronounOptions.some((option) => option.value === "custom"));
  assert.ok(pronounOptions.some((option) => option.value === "prefer_not_to_say"));
  assert.ok(genderIdentityOptions.some((option) => option.value === "trans_woman"));
  assert.ok(genderIdentityOptions.some((option) => option.value === "trans_man"));
  assert.ok(genderIdentityOptions.some((option) => option.value === "custom"));
  assert.ok(genderIdentityOptions.some((option) => option.value === "prefer_not_to_say"));
  assert.ok(supportStyleOptions.some((option) => option.value === "structured"));
});

test("care plan builder reflects profile focus areas", () => {
  const carePlan = buildCarePlanForGoals(["stress", "sleep"], "2026-06-24T10:00:00.000Z");

  assert.deepEqual(
    carePlan.focusAreas.map((area) => area.label),
    ["stress", "sleep"],
  );
  assert.ok(carePlan.recommendedModuleIds.includes("grounding-54321"));
  assert.ok(carePlan.recommendedModuleIds.includes("sleep-reset"));
  assert.equal(carePlan.updatedAt, "2026-06-24T10:00:00.000Z");
});

test("startup consent preserves privacy defaults with model training off", () => {
  const consent = buildStartupConsent({
    draft: {
      acceptedTerms: true,
      acceptedPrivacyPolicy: true,
      aiDisclosureAccepted: true,
      allowPersonalization: true,
      allowAnalytics: false,
      allowModelTraining: false,
    },
    now: "2026-06-24T10:00:00.000Z",
  });

  assert.equal(consent.acceptedTerms, true);
  assert.equal(consent.acceptedPrivacyPolicy, true);
  assert.equal(consent.aiDisclosureAccepted, true);
  assert.equal(consent.allowPersonalization, true);
  assert.equal(consent.allowModelTraining, false);
});
