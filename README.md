# Kin Mental Wellness Companion

Kin is a local-first AI-supported mental wellness companion for check-ins, journaling, structured coping tools, and progress tracking.

Kin is not a therapist, doctor, crisis counselor, medical provider, emergency service, or replacement for professional care. It does not diagnose conditions or prescribe medication.

## Unified Support Model

Kin keeps emotional support and ADHD/focus support inside one app. The primary navigation is:

```text
Home | Chat | Goals | Start | Review
```

Every Chat message runs through the Safety Router first. If normal coaching can continue, Kin classifies the message into support intents such as emotional support, ADHD/focus, goal tracking, task start, procrastination, planning, grounding, or crisis routing. The Chat mode selector lets the user choose `Support`, `Focus`, `Goals`, `Unblock`, or `Calm`, and Kin can suggest a better fit after reading the message.

If a user is overwhelmed, stuck, ashamed, anxious, depressed, distracted, procrastinating, or unable to start, Kin blends emotional support with executive-function support instead of making them choose between "mental health" and "ADHD."

## Run It

Install dependencies:

```powershell
npm.cmd install
```

Start the AI API:

```powershell
npm.cmd run server
```

In a second terminal, start the app:

```powershell
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:988
```

Or start both the API and app from one terminal:

```powershell
npm.cmd start
```

Check local and Tailscale reachability:

```powershell
npm.cmd run check:remote
```

This prints the local URL, LAN URL, Tailscale URL when a `100.x` address exists, API mode, app binding, and the next recovery action. It does not print API keys or `.env` values.

## Daily Use

Open Kin on this computer:

```text
http://127.0.0.1:988/
```

Open Kin from a trusted Tailscale device:

```text
http://<your-tailscale-ip>:988/
```

Useful commands:

```powershell
npm.cmd start
npm.cmd run desktop:start
npm.cmd run desktop:dev
npm.cmd run desktop:build
npm.cmd run health
npm.cmd run check:remote
npm.cmd run install:startup
npm.cmd run uninstall:startup
```

`npm.cmd run desktop:dev` builds the web app and opens Kin in an Electron desktop window. `npm.cmd run desktop:build` creates a Windows desktop build under `release\win-unpacked`. If Windows cannot clean a stale unpacked build on an external drive, the script creates a fresh timestamped folder under `release\`.

`npm.cmd run install:startup` first tries to create a per-user Windows scheduled task named `Kin Local Companion`. If Windows blocks scheduled-task creation, it falls back to a current-user Startup folder command with the same name. The startup entry launches the Kin desktop app, which starts the local Kin server and launches the Tailscale desktop app when available so the `100.x` remote URL can recover after login. Startup logs go to `%LOCALAPPDATA%\Kin\kin-desktop-startup.log`.

Inside Kin, open Privacy to see the setup checklist. It shows Google sign-in, encrypted vault unlock, Drive sync, OpenRouter mode, and app lock status in one place.

## Google Login and Private Drive Vault

Kin can be shared from GitHub without you seeing another person's private data. Each user signs in with their own Google account, unlocks a local vault passcode, and Kin stores an encrypted `kin-vault.enc.json` file in that user's hidden Google Drive app data folder. The vault is encrypted in the browser before upload.

To enable this path:

1. Create a Google Cloud OAuth web client.
2. Add your app origin to Authorized JavaScript origins, such as:
   - `http://127.0.0.1:988`
   - `https://<your-magicdns-name>.<your-tailnet>.ts.net`
   - `https://<your-github-username>.github.io`, if you publish on GitHub Pages
3. Copy `.env.example` to `.env` and set:

```text
VITE_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
```

No Google client secret belongs in this app. The OAuth client id is public. Users keep their own Google account, vault passcode, and optional OpenRouter key inside the encrypted vault from Privacy -> Google Drive sync.

For GitHub/static use, the Coach can call OpenRouter directly from the browser with the signed-in user's own encrypted OpenRouter key after the local safety router runs. For desktop/Tailscale use, the existing local API server can still use the server-owned `.env` OpenRouter key.

### GitHub Pages Sharing

The hosted GitHub Pages app is static. It does not run `server.mjs` and must not contain your private model API key.

For the shared friend build:

1. In GitHub repository settings, add an Actions/Pages variable named `VITE_GOOGLE_CLIENT_ID` with the public Google OAuth web client id.
2. In Google Cloud, keep the OAuth app external and add `https://<your-github-username>.github.io` to Authorized JavaScript origins.
3. Enable Pages with GitHub Actions. The included workflow builds with `VITE_KIN_HOSTING=github-pages`.
4. Share the Pages URL, usually `https://<your-github-username>.github.io/<repo-name>/`.

Every friend signs into their own Google account. Their app data syncs to their own encrypted Drive app-data vault. If they want real AI on GitHub Pages, they add their own OpenRouter key in Privacy -> Google Drive sync; otherwise Kin uses the built-in demo companion.

### Sync Between Phone and PC

Use the same Google account and the same vault passcode on each device. Journal, chat messages, goals, start sessions, weekly reviews, check-ins, memory, safety plan, tool progress, app lock settings, and user OpenRouter settings are included in the encrypted vault.

Auto sync uploads local changes shortly after edits and checks Drive when Kin opens, reconnects, comes back into view, and on the selected interval. If the Privacy -> Google Drive sync panel says `Needs Google` or `Refresh needed`, tap `Sync now` once to refresh the temporary browser Drive token.

Conflicts are intentionally manual: if Drive and the current device both changed, Kin asks whether to keep the Drive copy or this device copy.

## GitHub Friend Setup

Before sharing, confirm this repo has a valid Git repository and does not track secrets:

```powershell
git status --short
```

The `.gitignore` excludes `.env`, `node_modules`, `dist`, `release`, and logs. Friends should create their own `.env` from `.env.example`, configure their own Google OAuth client if they host their own origin, and use their own Google account/vault passcode. You cannot read their private vault unless they give you both their encrypted vault file and their vault passcode.

Do not commit `.env`, packaged `release` output, logs, personal Tailscale IPs, personal MagicDNS hostnames, screenshots, or local machine paths. For a friend/self-host release, use placeholders such as `<your-tailscale-ip>` in docs and let each user configure their own origins.

For a quick fresh-user smoke test:

1. Open Kin in a clean browser profile.
2. Sign in with Google.
3. Create a vault passcode.
4. Add one journal entry.
5. Tap `Sync now`.
6. Open Kin on a second device with the same Google account and passcode.
7. Confirm the journal entry appears.

## Optional Real AI With OpenRouter

By default, Kin uses a built-in demo companion so the app works without any account or key.

To connect a real model through OpenRouter, copy `.env.example` to `.env` and set:

```text
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=your_openrouter_model_slug
OPENROUTER_SITE_URL=http://127.0.0.1:988
OPENROUTER_APP_NAME=Kin Mental Wellness Companion
```

Then restart `npm.cmd run server`.

Kin keeps the OpenRouter key on the local API server, not in the browser. If OpenRouter is not configured, the server can still use the optional OpenAI fallback variables from `.env.example`, or it will remain in demo mode.

If an OpenRouter key was pasted into a chat, rotate it in the OpenRouter dashboard and update `.env` with the new key. Keep a spending limit enabled on the OpenRouter account and choose a model slug that fits the cost/quality tradeoff you want for personal use. The app status badge shows `OpenRouter`, `Demo`, or `Offline` so you can tell what mode is active.

## Safety

The safety router runs before normal coach responses in both the browser and API. If self-harm, suicide, violence, abuse, psychosis, mania, overdose, or emergency language is detected, Kin pauses normal AI coaching and opens the safety flow.

If someone might hurt themselves or someone else, use real-time human help. In the U.S., call or text **988**, use **988lifeline.org** chat, or call emergency services for immediate danger.

## Production Readiness

Kin is ready to harden as a private self-hosted wellness companion, not as a public clinical product. Before publishing to GitHub for friends:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run health
npm.cmd run check:remote
git status --short
```

Review:

- `docs/production-readiness.md`
- `docs/security-checklist.md`
- `docs/privacy-data-map.md`
- `docs/safety-policy.md`

Each user should bring their own Google account, vault passcode, and OpenRouter key. There is no shared admin dashboard and no developer-readable cloud database.

## Implemented MVP Features

- Google sign-in gate for private Drive vault use.
- Persistent SOS and crisis resource access.
- Daily mood, anxiety, stress, energy, and sleep check-ins.
- Constrained AI coach with diagnosis, medication, and therapy-replacement boundaries.
- Data-driven CBT, ACT, grounding, breathing, sleep, rumination, behavioral activation, self-compassion, and communication tools.
- Local journal and editable personal memory for preferences and short saved summaries.
- Progress trends and user-controlled handoff summary.
- Privacy center with export/delete controls, model-training opt-out, setup checklist, encrypted Google Drive sync, and a local app lock.
- Phone-first layout with install metadata and bottom navigation.
- Windows Electron desktop app, startup task support, health checks, and Tailscale remote-access diagnostics.

## Privacy Lock

Kin can require a local passcode before showing private app content. The lock stores a salted verifier, not the plaintext passcode, and still keeps SOS resources available while locked.

This is a screen lock for casual privacy on a trusted device. It is not full disk encryption. If the passcode is forgotten, recovery is deleting all local Kin data in that browser.

## Docs

- `docs/mental-health-feature-plan.md`
- `docs/production-readiness.md`
- `docs/security-checklist.md`
- `docs/safety-policy.md`
- `docs/ai-boundaries.md`
- `docs/privacy-data-map.md`
