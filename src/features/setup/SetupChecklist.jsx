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
      label: hosted ? "Optional backup vault" : "Encrypted vault",
      required: !hosted,
      done: Boolean(vaultUnlocked),
      detail: vaultUnlocked
        ? "Vault is unlocked on this device."
        : hosted
          ? "Optional: create this later if you want encrypted backup and restore."
          : "Create or unlock the vault with your passcode.",
    },
    {
      id: "drive",
      icon: ShieldCheck,
      label: hosted ? "Optional Drive backup" : "Drive sync",
      required: !hosted,
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
      required: false,
      done: Boolean(normalizedLock.enabled),
      detail: normalizedLock.enabled ? "Private screens lock after idle or refresh." : "Optional, recommended before sharing devices.",
    },
  ];
  const requiredItems = hosted ? items.filter((item) => item.required) : items;
  const completeCount = requiredItems.filter((item) => item.done).length;
  const nextItem = requiredItems.find((item) => !item.done);

  return (
    <section className="surface-section setup-checklist">
      <div className="section-heading">
        <div>
          <h2>{hosted ? "Account and backup" : "Setup checklist"}</h2>
          <p>
            {hosted
              ? "Google sign-in is the only required step. Encrypted Drive backup is optional."
              : `${completeCount} of ${items.length} ready for private daily use and GitHub sharing.`}
          </p>
        </div>
        <span className="setup-checklist__score">{completeCount}/{requiredItems.length}</span>
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
        <strong>{nextItem ? "Next:" : "Ready:"}</strong>{" "}
        {nextItem
          ? nextItem.detail
          : hosted
            ? "You can use Kin now. Set up encrypted Drive backup later only if you want sync and restore."
            : "Kin is ready for private synced use."}
      </p>
    </section>
  );
}

function driveSyncDetail(sync, hasDriveAccessToken, hosted = false) {
  if (sync.status === "conflict") return "Choose Drive copy or this device copy.";
  if (!sync.enabled || !sync.fileId) {
    return hosted ? "Optional: tap Sync now after setting up a backup vault." : "Tap Sync now after unlocking the vault.";
  }
  if (sync.status === "needs-google-session" || !hasDriveAccessToken) return "Tap Sync now once to refresh Drive access.";
  if (sync.status === "error") return sync.error || "Drive sync needs attention.";
  if (sync.autoSyncEnabled === false) return "Drive vault exists, but auto sync is paused.";
  return "Encrypted Drive vault is configured.";
}
