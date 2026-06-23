# Safety Policy

Kin uses a separate safety router before normal AI coaching. The router lives in `src/features/safety/safetyRouter.js` and is used by both the React UI and the Express API.

## Routed categories

- Self-harm ideation
- Self-harm intent
- Suicide plan or means
- Violence to others
- Abuse or exploitation
- Psychosis or reality confusion
- Mania or severe impulsivity
- Severe intoxication or overdose
- Medical emergency
- Minor user high risk
- Unknown high distress

## Behavior

When moderate, high, or imminent risk is detected:

- Normal AI coaching is paused.
- The app shows the safety flow.
- Crisis resources and emergency services are prominent.
- The app never tells the user they are safe based only on AI assessment.
- Safety signals store category, level, actions, and a hash of matched text rather than raw sensitive quoted text.

The U.S. resource is configured as the 988 Suicide & Crisis Lifeline. Country-specific crisis resources must be verified before public launch.
