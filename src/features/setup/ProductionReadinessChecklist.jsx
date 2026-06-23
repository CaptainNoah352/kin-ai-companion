import { CheckCircle2, Circle, FileCheck2, GitBranch, KeyRound, Scale, ShieldCheck, TestTube2 } from "lucide-react";
import { createDefaultAppLock } from "../privacy/appLockService.js";
import { createDefaultTrustedVaultUnlock } from "../sync/trustedVaultUnlockService.js";
import { createDefaultDriveSync } from "../sync/vaultDataService.js";

export function ProductionReadinessChecklist({
  googleSession,
  vaultUnlocked,
  driveSync,
  appLock,
  trustedVaultUnlock,
  apiMode,
  hasDriveAccessToken,
}) {
  const normalizedSync = createDefaultDriveSync(driveSync);
  const normalizedLock = createDefaultAppLock(appLock);
  const trustedUnlock = createDefaultTrustedVaultUnlock(trustedVaultUnlock);
  const items = [
    {
      id: "release",
      icon: GitBranch,
      label: "Release hygiene",
      done: false,
      detail: "Before GitHub sharing, commit a clean tree, tag a release, and confirm .env, release builds, logs, and personal URLs are not tracked.",
    },
    {
      id: "google",
      icon: KeyRound,
      label: "User-owned Google",
      done: Boolean(googleSession?.email && vaultUnlocked && normalizedSync.fileId),
      detail: googleSession?.email
        ? "Signed in. Confirm each friend uses their own Google OAuth setup or authorized origin."
        : "Sign in with Google, unlock the vault, then sync once.",
    },
    {
      id: "sync",
      icon: ShieldCheck,
      label: "Encrypted sync",
      done: Boolean(normalizedSync.enabled && normalizedSync.fileId && normalizedSync.status !== "conflict" && normalizedSync.status !== "error"),
      detail: syncDetail({ sync: normalizedSync, hasDriveAccessToken, trustedUnlock }),
    },
    {
      id: "ai",
      icon: TestTube2,
      label: "AI mode verified",
      done: apiMode === "openrouter" || apiMode === "openrouter-user",
      detail: apiMode === "openrouter-user"
        ? "User OpenRouter key is encrypted in the vault."
        : apiMode === "openrouter"
          ? "Local OpenRouter API is active."
          : "Demo/offline mode is fine for setup, but release testing needs real OpenRouter.",
    },
    {
      id: "privacy",
      icon: Scale,
      label: "Privacy and safety docs",
      done: false,
      detail: "Review docs/production-readiness.md and docs/security-checklist.md before publishing a GitHub release.",
    },
    {
      id: "lock",
      icon: FileCheck2,
      label: "Device privacy",
      done: Boolean(normalizedLock.enabled),
      detail: normalizedLock.enabled
        ? "App lock is enabled. Trusted vault unlock remains separate and opt-in."
        : "Enable app lock before testing on phones or shared computers.",
    },
  ];
  const doneCount = items.filter((item) => item.done).length;

  return (
    <section className="surface-section production-readiness">
      <div className="section-heading">
        <div>
          <h2>Production readiness</h2>
          <p>Friend/self-host release checklist. This does not make Kin a clinical product.</p>
        </div>
        <span className="setup-checklist__score">{doneCount}/{items.length}</span>
      </div>

      <div className="production-readiness__grid">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article className={item.done ? "production-item complete" : "production-item"} key={item.id}>
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
        <strong>Release default:</strong> each user owns their Google account, vault passcode, and OpenRouter key. You do
        not get a dashboard or readable access to their vault.
      </p>
    </section>
  );
}

function syncDetail({ sync, hasDriveAccessToken, trustedUnlock }) {
  if (sync.status === "conflict") return "Resolve the Drive conflict before release testing.";
  if (sync.status === "error") return sync.error || "Fix the Drive sync error before release testing.";
  if (!sync.fileId) return "Create or find the encrypted Drive vault with Sync now.";
  if (!hasDriveAccessToken) return "Vault can stay unlocked, but Google needs a fresh token for Drive sync.";
  if (trustedUnlock.enabled) return "Drive vault exists and this trusted device can auto-unlock the vault.";
  return "Drive vault exists. Remembered vault unlock is optional per trusted device.";
}
