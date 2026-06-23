import { Check, ChevronRight, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";

const limitationCopy =
  "This app provides mental health support, self-reflection, and evidence-informed coping tools. It is not a licensed therapist, medical provider, crisis service, or emergency service. It does not diagnose conditions, prescribe medication, or replace professional care.";

export function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    ageRange: "18_24",
    region: "US",
    language: "English",
    goals: ["stress"],
    acceptedTerms: false,
    acceptedPrivacyPolicy: false,
    aiDisclosureAccepted: false,
    allowPersonalization: true,
    allowAnalytics: false,
    allowModelTraining: false,
    allowCrisisContactUse: false,
    accessibilityPreferences: {
      reduceMotion: false,
      largeText: false,
      highContrast: false,
      screenReaderOptimized: false,
      simpleLanguage: false,
    },
  });

  const canContinue =
    step < 2 ||
    (draft.acceptedTerms && draft.acceptedPrivacyPolicy && draft.aiDisclosureAccepted);

  function toggleGoal(goal) {
    setDraft((current) => ({
      ...current,
      goals: current.goals.includes(goal)
        ? current.goals.filter((item) => item !== goal)
        : [...current.goals, goal],
    }));
  }

  function finish() {
    const now = new Date().toISOString();
    onComplete({
      consent: {
        userId: "local-user",
        acceptedTerms: draft.acceptedTerms,
        acceptedPrivacyPolicy: draft.acceptedPrivacyPolicy,
        aiDisclosureAccepted: draft.aiDisclosureAccepted,
        allowPersonalization: draft.allowPersonalization,
        allowAnalytics: draft.allowAnalytics,
        allowModelTraining: draft.allowModelTraining,
        allowCrisisContactUse: draft.allowCrisisContactUse,
        createdAt: now,
        updatedAt: now,
      },
      profile: {
        id: "local-user",
        ageRange: draft.ageRange,
        region: draft.region,
        language: draft.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        accessibilityPreferences: draft.accessibilityPreferences,
        createdAt: now,
        updatedAt: now,
      },
      carePlan: {
        id: crypto.randomUUID(),
        userId: "local-user",
        focusAreas: draft.goals.map((goal) => ({
          id: crypto.randomUUID(),
          label: goal,
          severity: "unknown",
        })),
        goals: draft.goals.map((goal) => ({
          id: crypto.randomUUID(),
          title: goal,
          userLanguage: goal.replaceAll("_", " "),
          status: "active",
          createdAt: now,
        })),
        recommendedModuleIds: initialModulesForGoals(draft.goals),
        checkInFrequency: "daily",
        reassessmentFrequencyDays: 14,
        createdAt: now,
        updatedAt: now,
      },
    });
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
            <p>AI-supported mental wellness companion</p>
          </div>
        </div>

        {step === 0 && (
          <div className="onboarding-step">
            <h2>Support with clear boundaries.</h2>
            <p>{limitationCopy}</p>
            <div className="notice-strip">
              <ShieldCheck size={20} />
              Crisis resources stay visible. High-risk messages pause AI coaching.
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-step">
            <h2>Your starting point</h2>
            <div className="form-grid form-grid--two">
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
            </div>
            <div className="choice-grid">
              {["anxiety", "low_mood", "stress", "sleep", "relationships", "self_esteem"].map((goal) => (
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

        {step === 2 && (
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
              title="I accept local data storage for this prototype."
              text="Your check-ins, journal, and chat history are stored in this browser unless deleted."
              onChange={(value) => setDraft({ ...draft, acceptedPrivacyPolicy: value })}
            />
            <ConsentToggle
              checked={draft.allowModelTraining}
              title="Model training"
              text="Off by default. This prototype does not use your content for model training."
              onChange={(value) => setDraft({ ...draft, allowModelTraining: value })}
            />
          </div>
        )}

        <div className="onboarding-footer">
          <span>{step + 1} of 3</span>
          {step > 0 && (
            <button className="ghost-button" type="button" onClick={() => setStep((value) => value - 1)}>
              Back
            </button>
          )}
          {step < 2 ? (
            <button className="primary-button primary-button--auto" type="button" onClick={() => setStep((value) => value + 1)}>
              Continue
              <ChevronRight size={17} />
            </button>
          ) : (
            <button className="primary-button primary-button--auto" type="button" disabled={!canContinue} onClick={finish}>
              Enter Kin
              <Lock size={17} />
            </button>
          )}
        </div>
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
