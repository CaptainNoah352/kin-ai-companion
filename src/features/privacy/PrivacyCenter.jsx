import { Database, Download, Eye, Lock, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
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
