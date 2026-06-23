# Kin Production Readiness

Kin's release target is a private, self-hosted wellness companion for trusted users. It is not a public SaaS, app-store product, therapist, medical device, crisis service, or clinical treatment tool.

## Release Model

- Each user runs their own Kin copy from GitHub, local Windows/Electron, or their own trusted host.
- Each user owns their Google account, encrypted Drive vault, vault passcode, and OpenRouter key.
- There is no developer admin dashboard and no central database that lets the repo owner read another user's journal, chat, goals, or check-ins.
- Google Drive sync uses a browser-encrypted vault in the user's Google Drive app data folder.

## Before Publishing to GitHub

Run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run health
npm.cmd run check:remote
git status --short
```

Confirm:

- `.env`, API keys, packaged `release` output, logs, screenshots, and local machine paths are not tracked.
- README examples use placeholders such as `<your-tailscale-ip>` and not personal Tailscale IPs or MagicDNS names.
- `.env.example` explains every required setting without containing secrets.
- The in-app Privacy screen shows setup status, production readiness, Drive sync status, app lock, and remote access status.
- A clean browser profile can sign in, create a vault, create a journal entry, sync, then restore that entry on a second device.

## Google OAuth Checklist

- Use an OAuth **Web application** client for the browser app.
- Add each real browser origin to Authorized JavaScript origins.
- Use HTTPS for non-localhost origins. Tailscale HTTPS/MagicDNS is preferred for phone access.
- Keep the client id public; do not add or commit a Google client secret.
- Configure the OAuth consent screen with an app name, support email, privacy policy URL, and test users before broad sharing.
- Verify current Google requirements for the `https://www.googleapis.com/auth/drive.appdata` scope before inviting users outside the test audience.

## Friend Privacy Smoke Test

1. Sign into Kin with your Google account and create a vault.
2. Add a journal entry and sync.
3. Sign out or use a clean browser profile.
4. Have a friend sign in with their Google account and create a different vault.
5. Confirm their data does not appear in your account and your data does not appear in theirs.
6. Confirm you cannot read their vault unless they provide both the encrypted vault file and the vault passcode.

## Not Included Yet

- Public SaaS hosting.
- Multi-user admin tooling.
- HIPAA/GDPR production compliance workflow.
- Licensed clinician review queue.
- App-store notarization/review.
- Automatic software updates.
