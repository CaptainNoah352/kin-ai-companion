import { classifySafety } from "./safetyRouter.js";

export function classifyAndStoreSafety(input, context, existingSignals = []) {
  const signal = classifySafety(input, context);
  if (signal.level === "none") return { signal, signals: existingSignals };
  return { signal, signals: [signal, ...existingSignals].slice(0, 100) };
}
