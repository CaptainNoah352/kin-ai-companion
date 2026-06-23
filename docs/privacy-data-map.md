# Privacy Data Map

Kin is local-first by default. Browser/device state is stored under the `kin.v2.*` localStorage namespace. When Google Drive sync is enabled, private app content is encrypted in the browser and uploaded as an encrypted vault file in the signed-in user's Google Drive app data folder.

| Category | Purpose | User can delete | AI personalization | Analytics | Model training |
|---|---|---:|---:|---:|---:|
| Consent settings | Records app limitation and privacy choices | No | No | No | No |
| Check-ins | Tracks mood, stress, sleep, and recommendations | Yes | Yes | No | No |
| Coach messages | Keeps conversation continuity | Yes | Yes | No | No |
| Journal entries | Stores private reflections | Yes | Yes | No | No |
| Personal memory | Stores user-editable context and saved summaries | Yes | Yes | No | No |
| App lock | Stores local screen-lock settings and a passcode verifier | Yes | No | No | No |
| Safety signals | Routes high-risk input without raw matched quotes | Yes | No | No | No |
| Safety plan | Stores user-controlled support plan | Yes | No | No | No |
| Google session | Stores account display metadata for this browser | Yes | No | No | No |
| Drive sync metadata | Tracks encrypted vault file id, status, and sync times | Yes | No | No | No |
| Encrypted vault | Stores encrypted synced Kin data in local storage and Google Drive app data | Yes | No | No | No |
| User OpenRouter settings | Optional user API key and model, encrypted inside the vault | Yes | Yes | No | No |

Model training is off by default. This prototype does not silently send raw journal, check-in, or crisis text to analytics providers. Coach messages and enabled personalization context are sent to the configured AI provider only when the user sends a Coach message.

The app lock is a local screen lock for casual privacy. It stores only verifier metadata, not a plaintext passcode, but it is not full disk encryption.

The Google Drive vault passcode is not stored by Kin, Google, or the local API server. Losing the passcode means the encrypted vault cannot be recovered.
