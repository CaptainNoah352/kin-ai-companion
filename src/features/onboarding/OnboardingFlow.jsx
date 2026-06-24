import { Check, ChevronRight, Lock, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildStartupConsent,
  buildStartupProfile,
  createStartupDraft,
  genderIdentityOptions,
  goalOptions,
  pronounOptions,
} from "./startupSetupService.js";

const limitationCopy =
  "This app provides mental health support, self-reflection, and evidence-informed coping tools. It is not a licensed therapist, medical provider, crisis service, or emergency service. It does not diagnose conditions, prescribe medication, or replace professional care.";

export function OnboardingFlow({
  email,
  hasAppPasscode,
  hasLocalVault,
  needsPasscodeSetup,
  needsProfileSetup,
  needsConsentSetup,
  profile,
  consent,
  onPasscodeSubmit,
  onComplete,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [passcodeComplete, setPasscodeComplete] = useState(!needsPasscodeSetup);
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState(() => createStartupDraft({ profile, consent }));
  const steps = useMemo(
    () =>
      [
        needsPasscodeSetup && !passcodeComplete ? "passcode" : null,
        needsProfileSetup ? "profile" : null,
        needsConsentSetup ? "boundaries" : null,
        needsConsentSetup ? "consent" : null,
      ].filter(Boolean),
    [needsConsentSetup, needsPasscodeSetup, needsProfileSetup, passcodeComplete],
  );
  const currentStep = steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))];
  const totalSteps = Math.max(steps.length, 1);
  const isNewPasscode = !hasAppPasscode;
  const profileReady = Boolean(draft.displayName.trim() && draft.region && draft.language.trim());
  const canContinue = currentStep === "profile" ? profileReady : true;
  const canFinish =
    draft.acceptedTerms &&
    draft.acceptedPrivacyPolicy &&
    draft.aiDisclosureAccepted &&
    (!needsProfileSetup || profileReady);

  async function submitPasscode(event) {
    event.preventDefault();
    if (isSubmitting) return;
    if (passcode.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (isNewPasscode && passcode !== confirmPasscode) {
      setError("Passcodes do not match.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    const result = await onPasscodeSubmit(passcode);
    if (!result?.ok) {
      setError(result?.message || "Kin passcode setup did not finish.");
      setPasscode("");
      setConfirmPasscode("");
      setIsSubmitting(false);
      return;
    }
    setPasscodeComplete(true);
    setPasscode("");
    setConfirmPasscode("");
    setIsSubmitting(false);
    setStepIndex(0);
  }

  async function finish() {
    if (isSubmitting || !canFinish) return;
    setIsSubmitting(true);
    setError("");
    const now = new Date().toISOString();
    const result = await onComplete({
      consent: buildStartupConsent({ draft, existingConsent: consent, now }),
      profile: buildStartupProfile({ draft, existingProfile: profile, now }),
      carePlan: buildCarePlan(draft.goals, now),
    });
    if (!result?.ok) {
      setError(result?.message || "Startup setup did not finish.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
  }

  function toggleGoal(goal) {
    setDraft((current) => ({
      ...current,
      goals: current.goals.includes(goal)
        ? current.goals.filter((item) => item !== goal)
        : [...current.goals, goal],
    }));
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-panel">
        <div className="brand brand--large">
          <div className="brand-mark">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1>Kin</h1>
            <p>{email || "Private startup setup"}</p>
          </div>
        </div>

        {currentStep === "passcode" && (
          <div className="onboarding-step">
            <div className="startup-step-heading">
              <Lock size={30} />
              <span>
                <h2>{isNewPasscode ? "Create your Kin passcode" : "Unlock your Kin vault"}</h2>
                <p>
                  This one passcode unlocks the app and encrypts the private vault. Set this up before entering profile
                  details so your personal information is protected from the start.
                </p>
              </span>
            </div>

            <form className="sync-unlock-panel" onSubmit={submitPasscode}>
              <label className="field-block">
                <span>{isNewPasscode ? "App and vault passcode" : "Passcode"}</span>
                <input
                  type="password"
                  value={passcode}
                  onChange={(event) => setPasscode(event.target.value)}
                  placeholder="Use at least 8 characters"
                  autoComplete={isNewPasscode ? "new-password" : "current-password"}
                />
              </label>
              {isNewPasscode && (
                <label className="field-block">
                  <span>Confirm passcode</span>
                  <input
                    type="password"
                    value={confirmPasscode}
                    onChange={(event) => setConfirmPasscode(event.target.value)}
                    placeholder="Re-enter passcode"
                    autoComplete="new-password"
                  />
                </label>
              )}
              {error && <p className="lock-error">{error}</p>}
              <button className="primary-button primary-button--auto" type="submit" disabled={!passcode || isSubmitting}>
                <Lock size={17} />
                {isSubmitting ? "Setting up..." : isNewPasscode ? "Set up vault" : "Unlock vault"}
              </button>
            </form>

            <p className="plain-copy">
              {hasLocalVault
                ? "Kin found a local encrypted vault. Use the same passcode to unlock it."
                : "Google may ask for Drive access so Kin can create or restore the encrypted vault."}
            </p>
          </div>
        )}

        {currentStep === "profile" && (
          <div className="onboarding-step">
            <div className="startup-step-heading">
              <UserRound size={30} />
              <span>
                <h2>Create your profile</h2>
                <p>Kin uses this to address you respectfully and personalize support. Identity details are optional.</p>
              </span>
            </div>

            <div className="form-grid form-grid--two">
              <label className="field-block">
                <span>Chosen name</span>
                <input
                  type="text"
                  value={draft.displayName}
                  onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
                  placeholder="What should Kin call you?"
                  autoComplete="given-name"
                />
              </label>
              <label className="field-block">
                <span>Pronouns</span>
                <select value={draft.pronouns} onChange={(event) => setDraft({ ...draft, pronouns: event.target.value })}>
                  {pronounOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {draft.pronouns === "custom" && (
                <label className="field-block">
                  <span>Custom pronouns</span>
                  <input
                    type="text"
                    value={draft.customPronouns}
                    onChange={(event) => setDraft({ ...draft, customPronouns: event.target.value })}
                    placeholder="Enter your pronouns"
                  />
                </label>
              )}
              <label className="field-block">
                <span>Gender identity</span>
                <select
                  value={draft.genderIdentity}
                  onChange={(event) => setDraft({ ...draft, genderIdentity: event.target.value })}
                >
                  {genderIdentityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {draft.genderIdentity === "custom" && (
                <label className="field-block">
                  <span>Custom gender identity</span>
                  <input
                    type="text"
                    value={draft.customGenderIdentity}
                    onChange={(event) => setDraft({ ...draft, customGenderIdentity: event.target.value })}
                    placeholder="Enter your identity"
                  />
                </label>
              )}
              <label className="field-block">
                <span>Age range</span>
                <select value={draft.ageRange} onChange={(event) => setDraft({ ...draft, ageRange: event.target.value })}>
                  <option value="13_17">13-17</option>
                  <option value="18_24">18-24</option>
                  <option value="25_34">25-34</option>
                  <option value="35_44">35-44</option>
                  <option value="45_64">45-64</option>
                  <option value="65_plus">65+</option>
                </select>
              </label>
              <label className="field-block">
                <span>Region</span>
                <select value={draft.region} onChange={(event) => setDraft({ ...draft, region: event.target.value })}>
                  <option value="US">United States</option>
                  <option value="SE">Sweden</option>
                  <option value="default">Other</option>
                </select>
              </label>
              <label className="field-block">
                <span>Language</span>
                <input
                  type="text"
                  value={draft.language}
                  onChange={(event) => setDraft({ ...draft, language: event.target.value })}
                />
              </label>
            </div>

            <label className="field-block">
              <span>Anything Kin should know about referring to you?</span>
              <textarea
                value={draft.identityNotes}
                onChange={(event) => setDraft({ ...draft, identityNotes: event.target.value })}
                placeholder="Optional"
                rows={3}
              />
            </label>

            <div className="choice-grid">
              {goalOptions.map((goal) => (
                <button
                  className={draft.goals.includes(goal) ? "choice-chip selected" : "choice-chip"}
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                >
                  <Check size={16} />
                  {goal.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === "boundaries" && (
          <div className="onboarding-step">
            <h2>Support with clear boundaries.</h2>
            <p>{limitationCopy}</p>
            <div className="notice-strip">
              <ShieldCheck size={20} />
              Crisis resources stay visible. High-risk messages pause AI coaching.
            </div>
          </div>
        )}

        {currentStep === "consent" && (
          <div className="onboarding-step">
            <h2>Consent and privacy</h2>
            <ConsentToggle
              checked={draft.aiDisclosureAccepted}
              title="I understand Kin uses AI support, not therapy."
              text="AI can be useful for reflection and coping tools, but it cannot diagnose, prescribe, or handle emergencies."
              onChange={(value) => setDraft({ ...draft, aiDisclosureAccepted: value })}
            />
            <ConsentToggle
              checked={draft.acceptedTerms}
              title="I understand the app limitations."
              text="Kin does not replace licensed care, crisis services, or emergency services."
              onChange={(value) => setDraft({ ...draft, acceptedTerms: value })}
            />
            <ConsentToggle
              checked={draft.acceptedPrivacyPolicy}
              title="I accept private app storage for this prototype."
              text="Your profile, check-ins, journal, and chat history are stored in this browser and encrypted in the vault."
              onChange={(value) => setDraft({ ...draft, acceptedPrivacyPolicy: value })}
            />
            <ConsentToggle
              checked={draft.allowModelTraining}
              title="Model training"
              text="Off by default. This prototype does not use your content for model training."
              onChange={(value) => setDraft({ ...draft, allowModelTraining: value })}
            />
            {error && <p className="lock-error">{error}</p>}
          </div>
        )}

        {currentStep !== "passcode" && (
          <div className="onboarding-footer">
            <span>
              {Math.min(stepIndex + 1, totalSteps)} of {totalSteps}
            </span>
            {stepIndex > 0 && (
              <button className="ghost-button" type="button" onClick={() => setStepIndex((value) => value - 1)}>
                Back
              </button>
            )}
            {stepIndex < steps.length - 1 ? (
              <button
                className="primary-button primary-button--auto"
                type="button"
                disabled={!canContinue}
                onClick={() => setStepIndex((value) => value + 1)}
              >
                Continue
                <ChevronRight size={17} />
              </button>
            ) : (
              <button className="primary-button primary-button--auto" type="button" disabled={!canFinish || isSubmitting} onClick={finish}>
                <Lock size={17} />
                {isSubmitting ? "Saving..." : "Enter Kin"}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function ConsentToggle({ checked, title, text, onChange }) {
  return (
    <label className="consent-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </label>
  );
}

function buildCarePlan(goals, now) {
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
