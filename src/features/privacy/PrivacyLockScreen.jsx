import { EyeOff, Lock, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getCrisisResource } from "../safety/crisisResources.js";
import { SOSButton } from "../safety/SOSButton.jsx";
import { isInCooldown } from "./appLockService.js";

export function PrivacyLockScreen({ appLock, region = "US", onUnlock, onDeleteAll }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [now, setNow] = useState(Date.now());
  const resource = getCrisisResource(region);
  const lockedUntil = appLock?.lockedUntil ? new Date(appLock.lockedUntil) : null;
  const cooldownActive = useMemo(() => isInCooldown(appLock, now), [appLock, now]);

  useEffect(() => {
    if (!lockedUntil) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  async function submitUnlock(event) {
    event.preventDefault();
    if (cooldownActive || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    const result = await onUnlock(passcode);
    if (!result.ok) {
      setError(result.message || "That passcode did not unlock Kin.");
      setPasscode("");
    }
    setIsSubmitting(false);
  }

  return (
    <main className="lock-shell">
      <section className="lock-panel">
        <div className="brand brand--lock">
          <div className="brand-mark">
            <Lock size={28} />
          </div>
          <div>
            <h1>Kin is locked</h1>
            <p>Enter your local passcode to show private content.</p>
          </div>
        </div>

        <form className="lock-form" onSubmit={submitUnlock}>
          <label className="field-block">
            <span>Passcode</span>
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter passcode"
              autoComplete="current-password"
              disabled={cooldownActive}
              aria-label="App lock passcode"
            />
          </label>
          {cooldownActive && (
            <p className="notice-strip">
              Too many wrong attempts. Try again after {lockedUntil?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.
            </p>
          )}
          {error && <p className="lock-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={!passcode || cooldownActive || isSubmitting}>
            <EyeOff size={17} />
            Unlock Kin
          </button>
        </form>

        <p className="plain-copy">
          This is a local screen lock for casual privacy. It is not full disk encryption and does not recover forgotten
          passcodes.
        </p>

        <div className="lock-actions">
          <SOSButton onClick={() => setShowSafety(true)} />
          <a className="safety-action safety-action--primary" href={`tel:${resource.call || resource.emergency}`}>
            <ShieldAlert size={20} />
            <span>
              <strong>{resource.call || resource.emergency}</strong>
              {resource.call ? `Call or text ${resource.call}` : "Call emergency services"}
            </span>
          </a>
        </div>

        {showSafety && (
          <section className="safety-flow">
            <div className="safety-flow__header">
              <div className="safety-flow__icon">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h2>Use immediate human support</h2>
                <p>Normal AI coaching stays locked. This app is not a crisis service.</p>
              </div>
            </div>
            <p className="safety-note">{resource.note}</p>
            <div className="button-row">
              <a className="primary-button primary-button--auto" href={`tel:${resource.call || resource.emergency}`}>
                Call or text {resource.call || resource.emergency}
              </a>
              {resource.chatUrl && (
                <a className="ghost-button" href={resource.chatUrl} target="_blank" rel="noreferrer">
                  Open crisis chat
                </a>
              )}
            </div>
          </section>
        )}

        <button className="ghost-button ghost-button--inline" type="button" onClick={() => setShowRecovery((value) => !value)}>
          Forgot passcode
        </button>

        {showRecovery && (
          <section className="recovery-panel">
            <strong>Delete all local Kin data</strong>
            <p>
              This removes the lock and all local Kin content in this browser. Type <code>DELETE KIN DATA</code> to confirm.
            </p>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="DELETE KIN DATA"
              aria-label="Delete all local Kin data confirmation"
            />
            <button
              className="danger-button"
              type="button"
              disabled={confirmation !== "DELETE KIN DATA"}
              onClick={onDeleteAll}
            >
              <Trash2 size={16} />
              Delete all local Kin data
            </button>
          </section>
        )}
      </section>
    </main>
  );
}
