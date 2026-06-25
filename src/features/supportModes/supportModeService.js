export const supportModeIds = {
  emotionalSupport: "emotional_support",
  adhdFocus: "adhd_focus",
  goalTracking: "goal_tracking",
  taskStart: "task_start",
  procrastination: "procrastination",
  planning: "planning",
  grounding: "grounding",
};

export const requiredSupportModes = [
  { id: supportModeIds.emotionalSupport, label: "Emotional Support" },
  { id: supportModeIds.adhdFocus, label: "Focus Coach" },
  { id: supportModeIds.goalTracking, label: "Goal Tracker" },
  { id: supportModeIds.taskStart, label: "Start Button" },
  { id: supportModeIds.procrastination, label: "Procrastination Unblocker" },
  { id: "body_doubling", label: "Body Doubling" },
  { id: supportModeIds.grounding, label: "Calm / Grounding" },
  { id: "weekly_review", label: "Weekly Review" },
];

export const chatModes = [
  { id: "Support", label: "Support", modeId: supportModeIds.emotionalSupport },
  { id: "Focus", label: "Focus", modeId: supportModeIds.adhdFocus },
  { id: "Goals", label: "Goals", modeId: supportModeIds.goalTracking },
  { id: "Unblock", label: "Unblock", modeId: supportModeIds.procrastination },
  { id: "Calm", label: "Calm", modeId: supportModeIds.grounding },
];

const modePriority = [
  supportModeIds.grounding,
  supportModeIds.procrastination,
  supportModeIds.taskStart,
  supportModeIds.adhdFocus,
  supportModeIds.goalTracking,
  supportModeIds.planning,
  supportModeIds.emotionalSupport,
];

const modeLabels = new Map([
  [supportModeIds.emotionalSupport, "Support"],
  [supportModeIds.adhdFocus, "Focus"],
  [supportModeIds.goalTracking, "Goals"],
  [supportModeIds.taskStart, "Start"],
  [supportModeIds.procrastination, "Unblock"],
  [supportModeIds.planning, "Goals"],
  [supportModeIds.grounding, "Calm"],
]);

export function classifySupportModes(text = "", { latestCheckIn } = {}) {
  const lower = normalizeText(text);
  const modes = new Set();

  if (
    hasAny(
      lower,
      /\b(overwhelmed|anxious|anxiety|ashamed|shame|guilt|guilty|depressed|depression|sad|low|stressed|stress|scared|afraid|spiral|worthless|frustrated|burned out|burnt out)\b/,
    )
  ) {
    modes.add(supportModeIds.emotionalSupport);
  }

  if (
    hasAny(
      lower,
      /\b(adhd|focus|focused|distracted|attention|executive dysfunction|scattered|forget|forgot|forgotten|time blind|time blindness|deadline|clutter|messy|mess|brain fog)\b/,
    )
  ) {
    modes.add(supportModeIds.adhdFocus);
  }

  if (hasAny(lower, /\b(goal|habit|progress|track|tracker|routine|streak|milestone|tiny steps?|next step|finish|complete)\b/)) {
    modes.add(supportModeIds.goalTracking);
  }

  if (
    hasAny(
      lower,
      /\b(start|begin|initiate|get going|first step|5 minute|five minute|tiny task)\b|\b(can't|cannot|cant|unable to|hard to|struggling to)\s+(start|begin|get going|initiate)\b/,
    )
  ) {
    modes.add(supportModeIds.taskStart);
  }

  if (
    hasAny(
      lower,
      /\b(procrastinat|avoid|avoiding|avoidance|putting off|put off|later|stuck|frozen|freeze|doomscroll|scrolling|can't make myself|cant make myself)\b/,
    )
  ) {
    modes.add(supportModeIds.procrastination);
  }

  if (hasAny(lower, /\b(plan|planning|schedule|prioritize|prioritise|calendar|organize|organise|break down|break it down|this week|tomorrow|today)\b/)) {
    modes.add(supportModeIds.planning);
  }

  if (hasAny(lower, /\b(calm|reset|ground|grounding|breathe|breathing|panic|panicking|overstimulated|overstimulating|sensory)\b/)) {
    modes.add(supportModeIds.grounding);
  }

  if (detectProcrastinationAsEmotionalAvoidance(lower)) {
    modes.add(supportModeIds.procrastination);
    modes.add(supportModeIds.emotionalSupport);
  }

  if (latestCheckIn?.anxietyScore >= 7 || latestCheckIn?.stressScore >= 7) {
    modes.add(supportModeIds.emotionalSupport);
    modes.add(supportModeIds.grounding);
  }
  if (latestCheckIn?.moodScore <= 4) modes.add(supportModeIds.emotionalSupport);

  if (!modes.size) modes.add(supportModeIds.emotionalSupport);
  return [...modes].sort((left, right) => modePriority.indexOf(left) - modePriority.indexOf(right));
}

export function detectProcrastinationAsEmotionalAvoidance(text = "") {
  const lower = normalizeText(text);
  const avoidance = hasAny(lower, /\b(procrastinat|avoid|avoiding|avoidance|putting off|put off|stuck|frozen|freeze|can't start|cannot start|cant start)\b/);
  const emotion = hasAny(lower, /\b(ashamed|shame|guilt|guilty|anxious|anxiety|overwhelmed|scared|afraid|embarrassed|depressed|sad|pressure|dread)\b/);
  return avoidance && emotion;
}

export function supportModeFromChatMode(chatMode = "Support") {
  return chatModes.find((mode) => mode.id === chatMode)?.modeId || supportModeIds.emotionalSupport;
}

export function chatModeFromSupportMode(modeId = supportModeIds.emotionalSupport) {
  if (modeId === supportModeIds.taskStart || modeId === supportModeIds.procrastination) return "Unblock";
  if (modeId === supportModeIds.planning || modeId === supportModeIds.goalTracking) return "Goals";
  if (modeId === supportModeIds.adhdFocus) return "Focus";
  if (modeId === supportModeIds.grounding) return "Calm";
  return "Support";
}

export function buildModeSuggestion(text = "", { manualChatMode = "Support", latestCheckIn } = {}) {
  const modes = classifySupportModes(text, { latestCheckIn });
  const suggestedModeId = modes.find((modeId) => modeId !== supportModeIds.emotionalSupport) || modes[0];
  const suggestedChatMode = chatModeFromSupportMode(suggestedModeId);
  const manualModeId = supportModeFromChatMode(manualChatMode);
  const isManualAligned = modes.includes(manualModeId) || suggestedChatMode === manualChatMode;

  return {
    modes,
    suggestedModeId,
    suggestedChatMode,
    manualChatMode,
    isManualAligned,
    emotionalAvoidance: detectProcrastinationAsEmotionalAvoidance(text),
    copy: buildSuggestionCopy({ suggestedChatMode, modes, isManualAligned, emotionalAvoidance: detectProcrastinationAsEmotionalAvoidance(text) }),
  };
}

export function buildSupportModePromptContext({ supportModes = [], manualChatMode = "Support", suggestedChatMode = "Support" } = {}) {
  const labels = supportModes.map((modeId) => modeLabels.get(modeId) || modeId).join(", ") || "Support";
  return [
    `Manual chat mode: ${manualChatMode}.`,
    `Suggested support mode: ${suggestedChatMode}.`,
    `Detected support intents: ${labels}.`,
    "Blend emotional support with executive-function support when the user is overwhelmed, stuck, ashamed, anxious, depressed, distracted, procrastinating, or unable to start.",
    "For procrastination, treat emotional avoidance as possible and use no-shame, tiny-step recovery language.",
  ].join("\n");
}

function buildSuggestionCopy({ suggestedChatMode, modes, isManualAligned, emotionalAvoidance }) {
  if (emotionalAvoidance) return "This looks like avoidance with pressure or feelings attached. Unblock can pair support with one tiny next step.";
  if (isManualAligned) return `${suggestedChatMode} fits what you wrote.`;
  return `${suggestedChatMode} may fit this message best.`;
}

function normalizeText(text = "") {
  return String(text).toLowerCase().replace(/\s+/g, " ").trim();
}

function hasAny(text, pattern) {
  return pattern.test(text);
}
