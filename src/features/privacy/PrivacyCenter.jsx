import { Database, Download, Eye, Lock, RotateCcw, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  buildStartupProfile,
  createStartupDraft,
  genderIdentityOptions,
  goalOptions,
  pronounOptions,
  supportStyleOptions,
} from "../onboarding/startupSetupService.js";
import { appLockTimeoutOptions, createDefaultAppLock } from "./appLockService.js";
import { dataCategories, buildPrivacyExport, downloadJson } from "./dataExport.js";
import { RemoteAccessPanel } from "./RemoteAccessPanel.jsx";

export function PrivacyCenter({
  consent,
  setConsent,
  exportData,
  appLock,
  onEnableAppLock,
  onChangeAppLockPasscode,
  onDisableAppLock,
  onLockNow,
  onUpdateAppLockTimeout,
  onDeleteJournal,
  onDeleteMentalHealthContent,
  onDeleteAll,
  setupChecklist,
  syncCenter,
}) {
  function toggle(key) {
    setConsent((current) => ({
      ...current,
      [key]: !current[key],
      updatedAt: new Date().toISOString(),
    }));
  }

  function downloadExport() {
    downloadJson(`kin-export-${new Date().toISOString().slice(0, 10)}.json`, buildPrivacyExport(exportData()));
  }

  return (
    <section className="privacy-layout">
      {setupChecklist}
      <RemoteAccessPanel />
      {syncCenter}

      <section className="surface-section">
        <div className="section-heading">
          <h2>Privacy center</h2>
          <p>Granular controls for local browser data on this device.</p>
        </div>

        <div className="privacy-toggle-list">
          <PrivacyToggle label="Personalization" checked={consent.allowPersonalization} onClick={() => toggle("allowPersonalization")} />
          <PrivacyToggle label="Analytics" checked={consent.allowAnalytics} onClick={() => toggle("allowAnalytics")} />
          <PrivacyToggle label="Model training" checked={consent.allowModelTraining} onClick={() => toggle("allowModelTraining")} />
          <PrivacyToggle label="Crisis contact use" checked={consent.allowCrisisContactUse} onClick={() => toggle("allowCrisisContactUse")} />
        </div>

        <div className="privacy-actions">
          <button className="primary-button primary-button--auto" type="button" onClick={downloadExport}>
            <Download size={17} />
            Export data
          </button>
          <button className="secondary-button secondary-button--auto" type="button" onClick={onDeleteJournal}>
            <Trash2 size={17} />
            Delete journal only
          </button>
          <button className="secondary-button secondary-button--auto" type="button" onClick={onDeleteMentalHealthContent}>
            <RotateCcw size={17} />
            Delete mental health content
          </button>
          <button className="danger-button" type="button" onClick={onDeleteAll}>
            <Trash2 size={17} />
            Delete all Kin data
          </button>
        </div>
      </section>

      <AppLockControls
        appLock={appLock}
        onEnableAppLock={onEnableAppLock}
        onChangeAppLockPasscode={onChangeAppLockPasscode}
        onDisableAppLock={onDisableAppLock}
        onLockNow={onLockNow}
        onUpdateAppLockTimeout={onUpdateAppLockTimeout}
      />

      <section className="surface-section">
        <div className="section-heading">
          <h2>Data map</h2>
          <p>Your mental-health content stays in local browser storage unless you send a Coach message to the configured AI provider.</p>
        </div>
        <div className="data-map">
          {dataCategories.map((category) => (
            <article key={category.key} className="data-row">
              <Database size={18} />
              <span>
                <strong>{category.label}</strong>
                <small>{category.purpose}</small>
              </span>
              <em>{category.userCanDelete ? "Deletable" : "Required"}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-section">
        <div className="section-heading">
          <h2>AI limitations</h2>
          <p>
            <Eye size={15} /> Always visible from settings.
          </p>
        </div>
        <p className="plain-copy">
          This app does not diagnose or replace professional care. It does not prescribe medication, provide crisis
          counseling, or make emergency decisions. High-risk input pauses normal coaching and opens the safety flow.
        </p>
      </section>
    </section>
  );
}

export function ProfileSettings({ profile, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => createStartupDraft({ profile }));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(createStartupDraft({ profile }));
  }, [profile]);

  async function saveProfile(event) {
    event.preventDefault();
    if (isSaving) return;
    if (!draft.displayName.trim()) {
      setError("Add a chosen name before saving.");
      return;
    }
    if (!draft.language.trim()) {
      setError("Add a language before saving.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");
    const nextProfile = buildStartupProfile({
      draft,
      existingProfile: profile || {},
      now: new Date().toISOString(),
    });
    const result = await onUpdateProfile(nextProfile);
    if (!result?.ok) {
      setError(result?.message || "Profile update did not finish.");
      setIsSaving(false);
      return;
    }
    setMessage(result.message || "Profile updated.");
    setIsEditing(false);
    setIsSaving(false);
  }

  function cancelEdit() {
    setDraft(createStartupDraft({ profile }));
    setMessage("");
    setError("");
    setIsEditing(false);
  }

  function toggleGoal(goal) {
    setDraft((current) => ({
      ...current,
      goals: current.goals.includes(goal)
        ? current.goals.filter((item) => item !== goal)
        : [...current.goals, goal],
    }));
  }

  function setAccessibilityPreference(key, value) {
    setDraft((current) => ({
      ...current,
      accessibilityPreferences: {
        ...current.accessibilityPreferences,
        [key]: value,
      },
    }));
  }

  return (
    <section className="surface-section profile-settings-card">
      <div className="section-heading">
        <div>
          <h2>Profile settings</h2>
          <p>Update how Kin addresses you and stores your profile in the encrypted vault.</p>
        </div>
        <UserRound size={22} />
      </div>

      {!isEditing ? (
        <>
          <div className="profile-summary-grid">
            <ProfileSummaryItem label="Chosen name" value={profile?.displayName || "Not set"} />
            <ProfileSummaryItem label="Pronouns" value={profile?.pronouns || "Prefer not to say"} />
            <ProfileSummaryItem label="Gender identity" value={formatIdentity(profile?.genderIdentity)} />
            <ProfileSummaryItem label="Region" value={formatRegion(profile?.region)} />
            <ProfileSummaryItem label="Support style" value={formatSupportStyle(profile?.supportStyle)} />
          </div>
          {profile?.identityNotes && <p className="plain-copy">{profile.identityNotes}</p>}
          {message && <p className="form-success">{message}</p>}
          <button className="primary-button primary-button--auto" type="button" onClick={() => setIsEditing(true)}>
            <UserRound size={17} />
            Edit profile
          </button>
        </>
      ) : (
        <form className="profile-settings-form" onSubmit={saveProfile}>
          <div className="form-grid form-grid--two">
            <label className="field-block">
              <span>Chosen name</span>
              <input
                type="text"
                value={draft.displayName}
                onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
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
            <label className="field-block">
              <span>Support style</span>
              <select
                value={draft.supportStyle}
                onChange={(event) => setDraft({ ...draft, supportStyle: event.target.value })}
              >
                {supportStyleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <p className="profile-settings-label">Focus areas</p>
            <div className="choice-grid">
              {goalOptions.map((goal) => (
                <button
                  className={draft.goals.includes(goal) ? "choice-chip selected" : "choice-chip"}
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                >
                  {goal.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="profile-settings-label">Accessibility preferences</p>
            <div className="profile-preference-grid">
              <PreferenceToggle
                checked={draft.accessibilityPreferences.reduceMotion}
                label="Reduce motion"
                onChange={(value) => setAccessibilityPreference("reduceMotion", value)}
              />
              <PreferenceToggle
                checked={draft.accessibilityPreferences.largeText}
                label="Large text"
                onChange={(value) => setAccessibilityPreference("largeText", value)}
              />
              <PreferenceToggle
                checked={draft.accessibilityPreferences.highContrast}
                label="High contrast"
                onChange={(value) => setAccessibilityPreference("highContrast", value)}
              />
              <PreferenceToggle
                checked={draft.accessibilityPreferences.screenReaderOptimized}
                label="Screen reader optimized"
                onChange={(value) => setAccessibilityPreference("screenReaderOptimized", value)}
              />
              <PreferenceToggle
                checked={draft.accessibilityPreferences.simpleLanguage}
                label="Simple language"
                onChange={(value) => setAccessibilityPreference("simpleLanguage", value)}
              />
            </div>
          </div>

          <label className="field-block">
            <span>Anything Kin should know about referring to you?</span>
            <textarea
              value={draft.identityNotes}
              onChange={(event) => setDraft({ ...draft, identityNotes: event.target.value })}
              rows={3}
            />
          </label>

          {error && <p className="lock-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}

          <div className="privacy-actions">
            <button className="primary-button primary-button--auto" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save profile"}
            </button>
            <button className="secondary-button secondary-button--auto" type="button" onClick={cancelEdit} disabled={isSaving}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function PreferenceToggle({ checked, label, onChange }) {
  return (
    <label className="profile-preference-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function ProfileSummaryItem({ label, value }) {
  return (
    <span className="profile-summary-item">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function formatIdentity(value) {
  if (!value) return "Prefer not to say";
  const option = genderIdentityOptions.find((item) => item.value === value);
  return option?.label || value;
}

function formatRegion(value) {
  const regions = {
    US: "United States",
    SE: "Sweden",
    default: "Other",
  };
  return regions[value] || "Other";
}

function formatSupportStyle(value) {
  const option = supportStyleOptions.find((item) => item.value === value);
  return option?.label || "Gentle";
}

function PrivacyToggle({ label, checked, onClick }) {
  return (
    <button className={checked ? "privacy-toggle selected" : "privacy-toggle"} type="button" onClick={onClick}>
      <span>{label}</span>
      <strong>{checked ? "On" : "Off"}</strong>
    </button>
  );
}

function AppLockControls({
  appLock,
  onEnableAppLock,
  onChangeAppLockPasscode,
  onDisableAppLock,
  onLockNow,
  onUpdateAppLockTimeout,
}) {
  const normalized = createDefaultAppLock(appLock);
  const [setupPasscode, setSetupPasscode] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [newConfirm, setNewConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function runAction(action) {
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await action();
      if (!result?.ok) {
        setError(result?.message || "The app lock update did not complete.");
        return;
      }
      setMessage(result.message || "App lock updated.");
      setSetupPasscode("");
      setSetupConfirm("");
      setCurrentPasscode("");
      setNewPasscode("");
      setNewConfirm("");
    } finally {
      setIsSaving(false);
    }
  }

  function validateMatch(passcode, confirmation) {
    if (passcode.length < 8) return "Use at least 8 characters.";
    if (passcode !== confirmation) return "Passcodes do not match.";
    return "";
  }

  return (
    <section className="surface-section app-lock-card">
      <div className="section-heading">
        <div>
          <h2>App lock</h2>
          <p>Local screen lock for casual privacy on this browser. This is not full disk encryption.</p>
        </div>
        <Lock size={22} />
      </div>

      <div className={normalized.enabled ? "notice-strip notice-strip--success" : "notice-strip"}>
        <ShieldCheck size={18} />
        {normalized.enabled ? "App lock is on." : "App lock is off."}
      </div>

      <label className="field-block lock-timeout-field">
        <span>Lock timeout</span>
        <select
          value={normalized.timeoutMinutes}
          onChange={(event) => onUpdateAppLockTimeout(event.target.value === "session" ? "session" : Number(event.target.value))}
        >
          {appLockTimeoutOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {!normalized.enabled ? (
        <div className="form-grid form-grid--two">
          <label className="field-block">
            <span>New app and vault passcode</span>
            <input
              type="password"
              value={setupPasscode}
              onChange={(event) => setSetupPasscode(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="field-block">
            <span>Confirm passcode</span>
            <input
              type="password"
              value={setupConfirm}
              onChange={(event) => setSetupConfirm(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button
            className="primary-button primary-button--auto"
            type="button"
            disabled={isSaving}
            onClick={() =>
              runAction(async () => {
                const validation = validateMatch(setupPasscode, setupConfirm);
                if (validation) return { ok: false, message: validation };
                return onEnableAppLock(setupPasscode);
              })
            }
          >
            Set app and vault passcode
          </button>
        </div>
      ) : (
        <div className="app-lock-actions">
          <button className="secondary-button secondary-button--auto" type="button" onClick={onLockNow}>
            <Lock size={17} />
            Lock now
          </button>

          <div className="form-grid form-grid--two">
            <label className="field-block">
              <span>Current passcode</span>
              <input
                type="password"
                value={currentPasscode}
                onChange={(event) => setCurrentPasscode(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label className="field-block">
              <span>New app and vault passcode</span>
              <input
                type="password"
                value={newPasscode}
                onChange={(event) => setNewPasscode(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="field-block">
              <span>Confirm new passcode</span>
              <input
                type="password"
                value={newConfirm}
                onChange={(event) => setNewConfirm(event.target.value)}
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="button-row">
            <button
              className="primary-button primary-button--auto"
              type="button"
              disabled={isSaving}
              onClick={() =>
                runAction(async () => {
                  const validation = validateMatch(newPasscode, newConfirm);
                  if (validation) return { ok: false, message: validation };
                  return onChangeAppLockPasscode(currentPasscode, newPasscode);
                })
              }
            >
              Change app and vault passcode
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={isSaving}
              onClick={() => runAction(() => onDisableAppLock(currentPasscode))}
            >
              Disable app lock
            </button>
          </div>
        </div>
      )}

      {message && <p className="notice-strip notice-strip--success">{message}</p>}
      {error && <p className="lock-error">{error}</p>}
    </section>
  );
}
