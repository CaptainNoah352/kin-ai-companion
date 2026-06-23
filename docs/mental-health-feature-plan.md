# Kin Mental Health Feature Plan

Kin is implemented as an AI-supported mental wellness companion, not an autonomous therapist or medical device.

## MVP scope implemented

- Google sign-in gate for private Drive vault use.
- Safety router shared by frontend and API.
- Persistent SOS access in the app shell.
- Daily check-in with mood, anxiety, stress, energy, sleep, emotion, body sensation, stressor, and note.
- Constrained coach with deterministic refusals for diagnosis, medication instructions, and therapy-replacement requests.
- Data-driven intervention tools for CBT, ACT, grounding, breathing, sleep, rumination, behavioral activation, self-compassion, and communication rehearsal.
- Progress dashboard with 7/30/90 day trend summaries.
- Privacy center with consent toggles, export, journal deletion, mental-health-content deletion, and full local deletion.
- Safety plan builder and user-controlled handoff summary.
- Encrypted Google Drive vault sync for journal, coach messages, check-ins, memory, safety plan, progress, and user OpenRouter settings.
- Phone-first navigation, install metadata, Windows Electron desktop app, startup task support, and Tailscale remote-access diagnostics.
- Setup checklist and sync troubleshooting panel for friend/GitHub readiness.

## Not implemented as clinical-grade features

- Licensed clinician dashboard.
- Referral or appointment booking.
- HIPAA/GDPR production compliance workflows.
- FHIR/SMART export.
- Clinical validation, diagnostic claims, medication support, or emergency service operation.
- Central admin dashboard or server-side data visibility for the app owner.

## Feature flags

Feature flags live in `src/lib/featureFlags.js`. They are centralized so future rollout can disable modules without removing code.
