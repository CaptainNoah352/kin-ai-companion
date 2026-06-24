import { AlertTriangle, Cloud, Download, KeyRound, LogOut, RefreshCw, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";

export function SyncCenter({
  googleSession,
  driveSync,
  vaultUnlocked,
  userOpenRouter,
  hasDriveAccessToken,
  onCreateOrUnlockVault,
  onSaveOpenRouter,
  onSyncNow,
  onToggleAutoSync,
  onUpdateAutoSyncInterval,
  onExportEncryptedBackup,
  onImportEncryptedBackup,
  onDeleteDriveVault,
  onDisconnectGoogle,
  hasConflict,
  onUseDriveCopy,
  onUseThisDevice,
  trustedVaultUnlock,
  onRememberTrustedVault,
  onForgetTrustedVault,
  message,
  error,
  isHostedBuild = false,
}) {
  const [passcode, setPasscode] = useState("");
  const [apiKey, setApiKey] = useState(userOpenRouter?.apiKey || "");
  const [model, setModel] = useState(userOpenRouter?.model || "openai/gpt-4o-mini");
  const hosted = Boolean(isHostedBuild);
  const autoSyncEnabled = driveSync?.autoSyncEnabled !== false;
  const autoSyncIntervalSeconds = normalizeAutoSyncInterval(driveSync?.autoSyncIntervalSeconds);

  useEffect(() => {
    setApiKey(userOpenRouter?.apiKey || "");
    setModel(userOpenRouter?.model || "openai/gpt-4o-mini");
  }, [userOpenRouter?.apiKey, userOpenRouter?.model]);

  async function unlockVault() {
    const result = await onCreateOrUnlockVault(passcode);
    if (result?.ok) setPasscode("");
  }

  function saveOpenRouter() {
    void onSaveOpenRouter({
      apiKey,
      model,
      appName: userOpenRouter?.appName || "Kin Mental Wellness Companion",
      siteUrl: userOpenRouter?.siteUrl || globalThis.location?.origin || "",
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="surface-section sync-card">
      <div className="section-heading">
        <div>
          <h2>{hosted ? "Encrypted Drive vault" : "Google Drive sync"}</h2>
          <p>
            {hosted
              ? "Required encrypted vault through your own Google Drive app data folder."
              : "Encrypted vault sync through your Google Drive app data folder."}
          </p>
        </div>
        <Cloud size={22} />
      </div>

      <div className="sync-status-grid">
        <StatusBox label="Google account" value={googleSession?.email || "Not signed in"} />
        <StatusBox label="Vault" value={vaultUnlocked ? "Unlocked" : "Locked"} />
        <StatusBox label={hosted ? "Drive vault" : "Drive sync"} value={driveSync?.enabled ? "Enabled" : "Not enabled"} />
        <StatusBox label="Auto sync" value={autoSyncEnabled ? "On" : "Paused"} />
        <StatusBox label="Last synced" value={formatTimestamp(driveSync?.lastSyncedAt)} />
        <StatusBox label="Last auto sync" value={formatTimestamp(driveSync?.lastAutoSyncAt)} />
        <StatusBox label="Last upload" value={formatTimestamp(driveSync?.lastAutoPushAt)} />
        <StatusBox label="Last pull" value={formatTimestamp(driveSync?.lastAutoPullAt)} />
        <StatusBox label="Drive token" value={hasDriveAccessToken ? "Ready" : "Refresh needed"} />
        <StatusBox label="Conflict" value={hasConflict ? "Needs choice" : "None"} />
        <StatusBox label="Status" value={formatSyncStatus(driveSync?.status)} />
      </div>

      <div className={hasConflict ? "sync-troubleshooting-panel sync-troubleshooting-panel--warning" : "sync-troubleshooting-panel"}>
        <AlertTriangle size={18} />
        <div>
          <strong>{hosted ? "Backup status" : "Sync troubleshooting"}</strong>
          <p>{syncHealthCopy({ driveSync, hasDriveAccessToken, hasConflict, vaultUnlocked, hosted })}</p>
          <small>Next action: {syncNextAction({ googleSession, vaultUnlocked, driveSync, hasDriveAccessToken, hasConflict, error, hosted })}</small>
        </div>
      </div>

      {!vaultUnlocked && (
        <div className="sync-unlock-panel">
          <label className="field-block">
            <span>Vault passcode</span>
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Create or unlock your encrypted vault"
              autoComplete="current-password"
            />
          </label>
          <button className="primary-button primary-button--auto" type="button" onClick={unlockVault}>
            <KeyRound size={17} />
            {hosted ? "Set up app passcode and vault" : "Create / unlock vault"}
          </button>
          <p className="plain-copy">
            {hosted
              ? "This required passcode unlocks Kin and encrypts the Drive vault. It is not sent to Google, GitHub, or Kin servers."
              : "This passcode encrypts the Google Drive vault. It is not sent to Google, GitHub, or Kin servers."}
          </p>
        </div>
      )}

      {vaultUnlocked && (
        <>
          <div className="trusted-vault-panel">
            <div>
              <strong>Trusted device unlock</strong>
              <p>
                {trustedVaultUnlock?.enabled
                  ? "Vault passcode is remembered on this browser profile."
                  : "Optionally unlock this vault automatically on this trusted personal device."}
              </p>
              <small>
                Status: {trustedVaultUnlock?.enabled ? "Remembered on this device" : "Not remembered"}. Anyone with
                access to this unlocked browser profile may be able to open Kin.
              </small>
            </div>
            {trustedVaultUnlock?.enabled ? (
              <button className="secondary-button secondary-button--auto" type="button" onClick={onForgetTrustedVault}>
                Forget remembered vault
              </button>
            ) : (
              <button className="secondary-button secondary-button--auto" type="button" onClick={onRememberTrustedVault}>
                Remember vault on this device
              </button>
            )}
          </div>

          {hasConflict && (
            <div className="sync-conflict-panel">
              <AlertTriangle size={19} />
              <div>
                <strong>Choose which encrypted copy to keep</strong>
                <p>Drive has a newer vault and this device also has local changes.</p>
              </div>
              <div className="sync-conflict-actions">
                <button className="secondary-button secondary-button--auto" type="button" onClick={onUseDriveCopy}>
                  Use Drive copy
                </button>
                <button className="primary-button primary-button--auto" type="button" onClick={onUseThisDevice}>
                  Use this device
                </button>
              </div>
            </div>
          )}

          <div className="sync-auto-panel">
            <button
              className={autoSyncEnabled ? "privacy-toggle selected sync-auto-toggle" : "privacy-toggle sync-auto-toggle"}
              type="button"
              aria-pressed={autoSyncEnabled}
              onClick={() => onToggleAutoSync?.(!autoSyncEnabled)}
            >
              <span>Auto sync</span>
              <strong>{autoSyncEnabled ? "On" : "Paused"}</strong>
            </button>
            <label className="field-block sync-interval-field">
              <span>Check Drive every</span>
              <select
                value={autoSyncIntervalSeconds}
                onChange={(event) => onUpdateAutoSyncInterval?.(Number(event.target.value))}
                disabled={!autoSyncEnabled}
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
              </select>
            </label>
            <p className="sync-auto-copy">Pushes after edits. Checks Drive when Kin opens, reconnects, or comes back into view.</p>
          </div>

          <div className="form-grid form-grid--two">
            <label className="field-block">
              <span>User OpenRouter key</span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-or-v1-..."
                autoComplete="off"
              />
            </label>
            <label className="field-block">
              <span>OpenRouter model</span>
              <input value={model} onChange={(event) => setModel(event.target.value)} />
            </label>
          </div>
          <button className="secondary-button secondary-button--auto" type="button" onClick={saveOpenRouter}>
            <KeyRound size={17} />
            Save key in vault
          </button>

          <div className="sync-actions">
            <button className="primary-button primary-button--auto" type="button" onClick={onSyncNow}>
              <RefreshCw size={17} />
              Sync now
            </button>
            <button className="secondary-button secondary-button--auto" type="button" onClick={onExportEncryptedBackup}>
              <Download size={17} />
              Export encrypted backup
            </button>
            <label className="secondary-button secondary-button--auto file-button">
              <Upload size={17} />
              Import encrypted backup
              <input type="file" accept="application/json,.json" onChange={(event) => onImportEncryptedBackup(event.target.files?.[0])} />
            </label>
          </div>
        </>
      )}

      <div className="sync-actions">
        <button className="ghost-button" type="button" onClick={onDisconnectGoogle}>
          <LogOut size={17} />
          Disconnect Google on this device
        </button>
        <button className="danger-button" type="button" onClick={onDeleteDriveVault} disabled={!driveSync?.fileId}>
          <Trash2 size={17} />
          Delete Drive vault
        </button>
      </div>

      {message && <p className="notice-strip notice-strip--success">{message}</p>}
      {error && <p className="lock-error">{error}</p>}
    </section>
  );
}

function StatusBox({ label, value }) {
  return (
    <span className="sync-status-box">
      <strong>{value}</strong>
      <small>{label}</small>
    </span>
  );
}

function formatTimestamp(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatSyncStatus(status) {
  const labels = {
    "auto-sync-enabled": "Auto on",
    "auto-sync-interval-updated": "Interval set",
    "auto-sync-paused": "Paused",
    conflict: "Conflict",
    error: "Error",
    "drive-vault-deleted": "Deleted",
    "local-ready": "Local ready",
    "needs-google-session": "Needs Google",
    "not-configured": "Not configured",
    "pending-auto-sync": "Waiting",
    synced: "Synced",
    syncing: "Syncing",
  };
  return labels[status] || "Unknown";
}

function syncHealthCopy({ driveSync, hasDriveAccessToken, hasConflict, vaultUnlocked, hosted }) {
  if (hasConflict) return "Drive and this device both changed. Kin is waiting for your choice.";
  if (driveSync?.status === "error") return driveSync.error || "The last Drive sync failed.";
  if (hosted && !vaultUnlocked) return "Set up the required app passcode to create or unlock the encrypted Drive vault.";
  if (!driveSync?.enabled || !driveSync?.fileId) {
    return hosted ? "The required Drive vault has not been linked yet." : "No Drive vault file has been linked from this browser yet.";
  }
  if (driveSync?.status === "needs-google-session" || !hasDriveAccessToken) {
    return "Google Drive access needs a fresh browser token.";
  }
  if (driveSync?.autoSyncEnabled === false) return "The encrypted Drive vault exists, but automatic sync is paused.";
  if (driveSync?.fileId) return "Drive sync is configured for this browser session.";
  return "No Drive vault file has been linked from this browser yet.";
}

function syncNextAction({ googleSession, vaultUnlocked, driveSync, hasDriveAccessToken, hasConflict, error, hosted }) {
  if (!googleSession?.email) return "Sign in with Google.";
  if (!vaultUnlocked) return hosted ? "Create the app passcode to set up the required vault." : "Create or unlock the encrypted vault.";
  if (hasConflict) return "Choose Use Drive copy or Use this device.";
  if (!driveSync?.enabled || !driveSync?.fileId) {
    return hosted ? "Tap Sync now to finish linking the required Drive vault." : "Tap Sync now to create or find the Drive vault.";
  }
  if (driveSync?.status === "needs-google-session" || !hasDriveAccessToken) return "Tap Sync now to refresh Google Drive access.";
  if (driveSync?.status === "error" || error) return "Fix the shown error, then tap Sync now.";
  if (driveSync?.autoSyncEnabled === false) return "Turn Auto sync on.";
  return "Leave Kin open; edits push automatically and other devices poll Drive.";
}

function normalizeAutoSyncInterval(value) {
  const numeric = Number(value);
  return [15, 30, 60, 120].includes(numeric) ? numeric : 30;
}
