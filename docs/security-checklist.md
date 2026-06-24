# Kin Security Checklist

This checklist is for the friend/self-host release model. It hardens Kin for trusted personal use, not public internet hosting.

## Secrets and Configuration

- Never commit `.env`, OpenRouter keys, Google credentials, exported vault files, logs, or packaged release output.
- Rotate any OpenRouter key that was pasted into chat, screenshots, issues, or commits.
- Keep `VITE_GOOGLE_CLIENT_ID` public and store no Google client secret in the app.
- Use `KIN_ALLOWED_HOSTS` for Vite hostnames and `KIN_ALLOWED_ORIGINS` for any additional API CORS origins.

## Local API

- `/api/health` and `/api/runtime/status` must never include `.env` values, OpenRouter keys, Google tokens, vault passcodes, salts, verifier hashes, or encrypted trusted-unlock internals.
- The API accepts same-origin requests plus loopback, private LAN, Tailscale `100.x`, `.ts.net`, and configured origins only.
- Express request bodies are limited to `1mb`.
- Basic security headers are set by the local API: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Cross-Origin-Opener-Policy`.

## Browser Data

- App lock is only a local screen lock. It is not full disk encryption.
- Trusted-device vault unlock is opt-in and should be used only on personal devices.
- Google Drive access tokens stay session-only. Kin can remember the vault locally, but Google may still require a fresh `Sync now` gesture.
- Privacy export must redact app-lock salt/verifier, encrypted vault ciphertext, OpenRouter keys, and trusted-unlock ciphertext/key data.

## Safety and AI Boundaries

- Kin must not claim to diagnose, prescribe medication, replace therapy, or provide emergency/crisis services.
- The Support page provides static crisis and emergency resource references only.
- OpenRouter mode must be visible in the UI as OpenRouter, Demo, or Offline.

## Release Tests

Run before tagging a release:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run health
npm.cmd run check:remote
npm.cmd audit --audit-level=moderate
```

Also test:

- Clean browser profile first run.
- iPhone/Tailscale access.
- Electron desktop launch.
- App lock after refresh.
- Vault unlock, trusted-device unlock, `Sync now`, and second-device restore.
- Privacy export and delete flows.
