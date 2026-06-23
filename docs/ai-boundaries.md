# AI Boundaries

Kin's AI coach can:

- Reflect feelings.
- Ask gentle clarifying questions.
- Suggest evidence-informed app tools.
- Help users identify thoughts, emotions, values, and behaviors.
- Encourage professional or crisis support when appropriate.

Kin's AI coach must not:

- Diagnose conditions.
- Prescribe or recommend medication changes.
- Replace a therapist, doctor, crisis counselor, or emergency service.
- Provide self-harm instructions.
- Provide crisis counseling as the final support path.
- Tell a user they are safe based only on chat.

The configurable prompt contract is stored in `src/content/prompts/ai-coach-system.md`. The executable server prompt is exported from `src/features/aiCoach/aiCoachPrompts.js`.

Deterministic boundary handling lives in `src/features/aiCoach/aiCoachService.js` so common unsafe scopes are refused before any model call.
