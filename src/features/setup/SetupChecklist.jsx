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
  isHostedBuild = false,
}) {
  const hosted = Boolean(isHostedBuild);
  const normalizedSync = createDefaultDriveSync(driveSync);
  const normalizedLock = createDefaultAppLock(appLock);
  const items = [
    {
      id: "google",
      icon: Cloud,
      label: "Google account",
      required: true,
      done: Boolean(googleSession?.email),
      detail: googleSession?.email
        ? hosted
          ? "Signed in. If the Home Screen app opens fresh, sign in once there too."
          : googleSession.email
        : "Sign in with Google to enter Kin.",
    },
    {
      id: "vault",
      icon: KeyRound,
      label: hosted ? "App passcode and vault" : "Encrypted vault",
      required: true,
      done: hosted ? Boolean(vaultUnlocked && normalizedLock.enabled) : Boolean(vaultUnlocked),
      detail: vaultUnlocked
        ? hosted
          ? "The same passcode unlocks Kin and the encrypted vault."
          : "Vault is unlocked on this device."
        : hosted
          ? "Create the app passcode to set up the required encrypted vault."
          : "Create or unlock the vault with your passcode.",
    },
    {
      id: "drive",
      icon: ShieldCheck,
      label: hosted ? "Drive vault" : "Drive sync",
      required: true,
      done: Boolean(normalizedSync.enabled && normalizedSync.fileId && normalizedSync.status !== "error" && normalizedSync.status !== "conflict"),
      detail: driveSyncDetail(normalizedSync, hasDriveAccessToken, hosted),
    },
    {
      id: "ai",
      icon: MessageCircle,
      label: "AI support",
      required: !hosted,
      done: apiMode === "openrouter" || apiMode === "openrouter-user",
      detail: apiMode === "openrouter-user"
        ? "Using the encrypted user OpenRouter key."
        : apiMode === "openrouter"
          ? hosted
            ? "Connected through the hosted Kin API."
            : "Using the local OpenRouter API."
          : hosted
            ? "Kin opens now; AI may be limited until the hosted API wakes up."
            : "Demo mode works, but real AI is not connected yet.",
    },
    {
      id: "lock",
      icon: Lock,
      label: "App lock",
      required: !hosted,
      visible: !hosted,
      done: Boolean(normalizedLock.enabled),
      detail: normalizedLock.enabled ? "Private screens lock after idle or refresh." : "Optional, recommended before sharing devices.",
    },
  ];
  const visibleItems = items.filter((item) => item.visible !== false);
  const requiredItems = hosted ? visibleItems.filter((item) => item.required) : visibleItems;
  const completeCount = requiredItems.filter((item) => item.done).length;
  const nextItem = requiredItems.find((item) => !item.done);

  return (
    <section className="surface-section setup-checklist">
      <div className="section-heading">
        <div>
          <h2>{hosted ? "Account and backup" : "Setup checklist"}</h2>
          <p>
            {hosted
              ? "Google sign-in plus one passcode are required. That passcode unlocks Kin and encrypts the vault."
              : `${completeCount} of ${items.length} ready for private daily use and GitHub sharing.`}
          </p>
        </div>
        <span className="setup-checklist__score">{completeCount}/{requiredItems.length}</span>
      </div>

      <div className="setup-checklist__items">
        {visibleItems.map((item) => {
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
        <strong>{nextItem ? "Next:" : "Ready:"}</strong>{" "}
        {nextItem
          ? nextItem.detail
          : hosted
            ? "Kin is ready. The app passcode and encrypted Drive vault are linked."
            : "Kin is ready for private synced use."}
      </p>
    </section>
  );
}

function driveSyncDetail(sync, hasDriveAccessToken, hosted = false) {
  if (sync.status === "conflict") return "Choose Drive copy or this device copy.";
  if (!sync.enabled || !sync.fileId) {
    return hosted ? "Create the required vault during passcode setup." : "Tap Sync now after unlocking the vault.";
  }
  if (sync.status === "needs-google-session" || !hasDriveAccessToken) return "Tap Sync now once to refresh Drive access.";
  if (sync.status === "error") return sync.error || "Drive sync needs attention.";
  if (sync.autoSyncEnabled === false) return "Drive vault exists, but auto sync is paused.";
  return "Encrypted Drive vault is configured.";
}
