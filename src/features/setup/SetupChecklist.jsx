import { CheckCircle2, Circle, Cloud, KeyRound, Lock, MessageCircle, ShieldCheck } from "lucide-react";
import { createDefaultAppLock } from "../privacy/appLockService.js";
import { createDefaultDriveSync } from "../sync/vaultDataService.js";

export function SetupChecklist({
  googleSession,
  vaultUnlocked,
  driveSync,
  apiMode,
  appLock,
  hasDriveAccessToken,
}) {
  const normalizedSync = createDefaultDriveSync(driveSync);
  const normalizedLock = createDefaultAppLock(appLock);
  const items = [
    {
      id: "google",
      icon: Cloud,
      label: "Google account",
      done: Boolean(googleSession?.email),
      detail: googleSession?.email || "Sign in with Google to use a private Drive vault.",
    },
    {
      id: "vault",
      icon: KeyRound,
      label: "Encrypted vault",
      done: Boolean(vaultUnlocked),
      detail: vaultUnlocked ? "Vault is unlocked on this device." : "Create or unlock the vault with your passcode.",
    },
    {
      id: "drive",
      icon: ShieldCheck,
      label: "Drive sync",
      done: Boolean(normalizedSync.enabled && normalizedSync.fileId && normalizedSync.status !== "error" && normalizedSync.status !== "conflict"),
      detail: driveSyncDetail(normalizedSync, hasDriveAccessToken),
    },
    {
      id: "ai",
      icon: MessageCircle,
      label: "OpenRouter",
      done: apiMode === "openrouter" || apiMode === "openrouter-user",
      detail: apiMode === "openrouter-user"
        ? "Using the encrypted user OpenRouter key."
        : apiMode === "openrouter"
          ? "Using the local OpenRouter API."
          : "Demo mode works, but real AI is not connected yet.",
    },
    {
      id: "lock",
      icon: Lock,
      label: "App lock",
      done: Boolean(normalizedLock.enabled),
      detail: normalizedLock.enabled ? "Private screens lock after idle or refresh." : "Optional, recommended before sharing devices.",
    },
  ];
  const completeCount = items.filter((item) => item.done).length;
  const nextItem = items.find((item) => !item.done);

  return (
    <section className="surface-section setup-checklist">
      <div className="section-heading">
        <div>
          <h2>Setup checklist</h2>
          <p>{completeCount} of {items.length} ready for private daily use and GitHub sharing.</p>
        </div>
        <span className="setup-checklist__score">{completeCount}/{items.length}</span>
      </div>

      <div className="setup-checklist__items">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article className={item.done ? "setup-step complete" : "setup-step"} key={item.id}>
              <Icon size={18} />
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              {item.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </article>
          );
        })}
      </div>

      <p className="setup-checklist__next">
        <strong>Next:</strong> {nextItem ? nextItem.detail : "Kin is ready for private synced use."}
      </p>
    </section>
  );
}

function driveSyncDetail(sync, hasDriveAccessToken) {
  if (sync.status === "conflict") return "Choose Drive copy or this device copy.";
  if (sync.status === "needs-google-session" || !hasDriveAccessToken) return "Tap Sync now once to refresh Drive access.";
  if (!sync.enabled || !sync.fileId) return "Tap Sync now after unlocking the vault.";
  if (sync.status === "error") return sync.error || "Drive sync needs attention.";
  if (sync.autoSyncEnabled === false) return "Drive vault exists, but auto sync is paused.";
  return "Encrypted Drive vault is configured.";
}
