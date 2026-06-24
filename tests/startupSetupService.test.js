import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStartupConsent,
  buildStartupProfile,
  createStartupDraft,
  genderIdentityOptions,
  isStartupConsentComplete,
  isStartupProfileComplete,
  pronounOptions,
} from "../src/features/onboarding/startupSetupService.js";

test("startup profile requires a chosen name and completed setup timestamp", () => {
  assert.equal(isStartupProfileComplete({ displayName: "Sam" }), false);
  assert.equal(isStartupProfileComplete({ displayName: "  ", setupCompletedAt: "2026-06-24T10:00:00.000Z" }), false);
  assert.equal(isStartupProfileComplete({ displayName: "Sam", setupCompletedAt: "2026-06-24T10:00:00.000Z" }), true);
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
    },
    existingProfile: { id: "local-user" },
    now: "2026-06-24T10:00:00.000Z",
  });

  assert.equal(profile.displayName, "Hunter");
  assert.equal(profile.pronouns, "xe/xem");
  assert.equal(profile.genderIdentity, "trans_woman");
  assert.equal(profile.identityNotes, "Use feminine language.");
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
      allowCrisisContactUse: false,
    },
    now: "2026-06-24T10:00:00.000Z",
  });

  assert.equal(consent.acceptedTerms, true);
  assert.equal(consent.acceptedPrivacyPolicy, true);
  assert.equal(consent.aiDisclosureAccepted, true);
  assert.equal(consent.allowPersonalization, true);
  assert.equal(consent.allowModelTraining, false);
});
