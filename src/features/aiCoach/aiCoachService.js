import { appSpaceIds, normalizeAppSpace } from "../appSpaces/appSpaceService.js";
import {
  buildModeSuggestion,
  classifySupportModes,
  detectProcrastinationAsEmotionalAvoidance,
  supportModeIds,
} from "../supportModes/supportModeService.js";

const diagnosisPattern =
  /\b(diagnose me|do i have|am i|is this|what disorder|what condition)\b.{0,90}\b(bipolar|adhd|depression|anxiety disorder|ptsd|ocd|personality disorder|condition|disorder)\b/i;
const medicationPattern =
  /\b(should i|can i|is it safe to|stop|start|change|increase|decrease|mix|take).{0,80}\b(antidepressant|ssri|snri|prozac|zoloft|lexapro|wellbutrin|xanax|klonopin|adderall|medication|medicine|dose|dosage|pills?)\b/i;
const therapistPattern = /\b(be my therapist|act as my therapist|you are my therapist|therapy session|replace my therapist)\b/i;

export function classifyCoachBoundary(text) {
  if (medicationPattern.test(text)) return "medication";
  if (therapistPattern.test(text)) return "therapy_replacement";
  if (diagnosisPattern.test(text)) return "diagnosis";
  return "none";
}

export function createCoachReply({
  text,
  mood,
  latestCheckIn,
  memory,
  supportModes,
  manualChatMode = "Support",
  suggestedChatMode,
  activeAppSpace = appSpaceIds.wellness,
  bridgeContext,
}) {
  const modeSuggestion = buildModeSuggestion(text, { manualChatMode, latestCheckIn });
  const resolvedSupportModes = Array.isArray(supportModes) && supportModes.length ? supportModes : modeSuggestion.modes;
  const resolvedSuggestedChatMode = suggestedChatMode || modeSuggestion.suggestedChatMode;
  const resolvedAppSpace = normalizeAppSpace(activeAppSpace);
  const boundary = classifyCoachBoundary(text);
  if (boundary === "diagnosis") {
    return {
      role: "assistant",
      content:
        "I cannot diagnose you or tell you whether you have a condition. A useful next step is to track what you are noticing and share it with a licensed professional. Try a check-in or thought journal so you have clearer notes to bring to care.",
      recommendedModuleIds: ["cbt-thought-record"],
      supportModes: resolvedSupportModes,
      suggestedChatMode: resolvedSuggestedChatMode,
      explanation: "Diagnosis requests are redirected toward tracking and professional support.",
    };
  }

  if (boundary === "medication") {
    return {
      role: "assistant",
      content:
        "I cannot give medication instructions or tell you to start, stop, or change a dose. Please contact your prescriber, pharmacist, or urgent medical care if this feels time-sensitive. A useful next step here is to write down what changed, when it started, and any symptoms you want to ask about.",
      recommendedModuleIds: ["cbt-thought-record"],
      supportModes: resolvedSupportModes,
      suggestedChatMode: resolvedSuggestedChatMode,
      explanation: "Medication decisions are kept with licensed medical professionals.",
    };
  }

  if (boundary === "therapy_replacement") {
    return {
      role: "assistant",
      content:
        "I can support reflection and coping practice, but I am not a therapist and cannot replace professional care. A useful next step is to pick one thing you want help sorting out, then we can choose a tool such as grounding, a thought record, or communication rehearsal.",
      recommendedModuleIds: ["grounding-54321"],
      supportModes: resolvedSupportModes,
      suggestedChatMode: resolvedSuggestedChatMode,
      explanation: "The app keeps AI support inside non-clinical coaching boundaries.",
    };
  }

  const recommendedModuleIds = recommendModules({ text, latestCheckIn });
  const reflection = buildReflection(text, mood, latestCheckIn, memory, resolvedSupportModes, resolvedAppSpace, bridgeContext);
  const nextStep = buildNextStep(text, latestCheckIn, resolvedSupportModes, resolvedAppSpace);
  const module = recommendedModuleIds[0] || "grounding-54321";
  const modeLine = modeSuggestion.emotionalAvoidance
    ? "\n\nThis may be procrastination with pressure, shame, or anxiety attached. We can lower the emotional load and still choose one tiny action."
    : "";

  return {
    role: "assistant",
    content: `${reflection}${modeLine}\n\nA useful next step: ${nextStep}\n\nTry this in the app: ${moduleLabel(module)}, because it gives you a structured way to work with this without needing to solve everything at once.`,
    recommendedModuleIds,
    supportModes: resolvedSupportModes,
    suggestedChatMode: resolvedSuggestedChatMode,
    activeAppSpace: resolvedAppSpace,
    explanation: "Response uses reflection, one practical step, and an in-app tool recommendation.",
  };
}

export function recommendModules({ text = "", latestCheckIn } = {}) {
  const lower = text.toLowerCase();
  const modes = classifySupportModes(text, { latestCheckIn });
  const modules = [];

  if (modes.includes(supportModeIds.grounding)) modules.push("grounding-54321", "breathing-box");
  if (modes.includes(supportModeIds.procrastination) || modes.includes(supportModeIds.taskStart)) {
    modules.push("behavioral-activation", "self-compassion");
  }
  if (modes.includes(supportModeIds.goalTracking) || modes.includes(supportModeIds.planning)) {
    modules.push("behavioral-activation", "act-values");
  }
  if (/panic|anxious|overwhelmed|spiral|stress/.test(lower)) modules.push("grounding-54321", "breathing-box");
  if (/sad|low|stuck|depressed|nothing matters/.test(lower)) modules.push("behavioral-activation", "self-compassion");
  if (/sleep|tired|insomnia|bed/.test(lower)) modules.push("sleep-reset");
  if (/relationship|argument|boundary|conversation|partner|friend|family/.test(lower)) modules.push("communication-rehearsal");
  if (/worry|ruminate|overthink/.test(lower)) modules.push("rumination-worry-window", "cbt-thought-record");

  if (latestCheckIn?.anxietyScore >= 7 || latestCheckIn?.stressScore >= 7) {
    modules.push("grounding-54321", "breathing-box");
  }
  if (latestCheckIn?.sleepQuality <= 4) modules.push("sleep-reset");
  if (latestCheckIn?.moodScore <= 4) modules.push("behavioral-activation");

  return [...new Set(modules)].slice(0, 3);
}

function buildReflection(text, mood, latestCheckIn, memory, supportModes = [], activeAppSpace = appSpaceIds.wellness, bridgeContext) {
  const bridgeLine = buildBridgeLine(activeAppSpace, bridgeContext);
  const clean = text.trim();
  if (detectProcrastinationAsEmotionalAvoidance(text)) {
    return `I am hearing both avoidance and a feeling load around it. That is common when a task starts carrying shame, pressure, or dread.${bridgeLine}`;
  }
  if (supportModes.includes(supportModeIds.adhdFocus) || supportModes.includes(supportModeIds.taskStart)) {
    return `I am hearing an executive-function problem, not a character problem. We can make the start smaller and more concrete.${bridgeLine}`;
  }
  if (memory?.supportStyle) {
    const style = memory.supportStyle.slice(0, 120);
    if (mood) {
      return `I am here with you, and I will keep your preferred support style in mind: ${style}. I am also hearing a ${mood.toLowerCase()} tone today.${bridgeLine}`;
    }
    return `I am here with you, and I will keep your preferred support style in mind: ${style}. What you shared sounds worth slowing down with.${bridgeLine}`;
  }
  if (mood) return `I am hearing that today has a ${mood.toLowerCase()} tone, and this is taking some real attention.${bridgeLine}`;
  if (latestCheckIn?.primaryEmotion) {
    return `I am hearing ${latestCheckIn.primaryEmotion.toLowerCase()} in what you wrote.${bridgeLine}`;
  }
  if (activeAppSpace === appSpaceIds.adhd) return `I am reading this in Focus mode, so we can turn it into a smaller next action.${bridgeLine}`;
  if (clean.length < 80) return `I am hearing that there is something here worth slowing down with.${bridgeLine}`;
  return `I am hearing a mix of pressure and meaning in what you shared.${bridgeLine}`;
}

function buildNextStep(text, latestCheckIn, supportModes = [], activeAppSpace = appSpaceIds.wellness) {
  const lower = text.toLowerCase();
  if (supportModes.includes(supportModeIds.procrastination)) return "name the task you are avoiding, then do one visible action for five minutes.";
  if (supportModes.includes(supportModeIds.taskStart)) return "make the first step so small it can be done in under one minute, then start a five-minute timer.";
  if (supportModes.includes(supportModeIds.adhdFocus)) return "clear one cue from your space, pick one task, and keep only the first action in view.";
  if (supportModes.includes(supportModeIds.goalTracking) || supportModes.includes(supportModeIds.planning)) {
    return "choose one tiny next step and decide when you will check back in without using shame if it slips.";
  }
  if (/panic|overwhelmed|anxious|stress/.test(lower)) return "lower the intensity first by naming one thing you can see, feel, and hear.";
  if (/sleep|tired|insomnia/.test(lower)) return "choose one small wind-down cue you can repeat tonight.";
  if (/relationship|argument|boundary/.test(lower)) return "write one sentence that starts with what you feel and one sentence that names what you need.";
  if (latestCheckIn?.stressScore >= 7) return "pick the smallest task or care action that would reduce pressure by 5%.";
  if (activeAppSpace === appSpaceIds.adhd) return "write the first visible action, remove one distraction cue, and start for five minutes.";
  return "name the feeling, then choose one concrete action that can happen in the next ten minutes.";
}

function buildBridgeLine(activeAppSpace, bridgeContext) {
  if (!bridgeContext?.sharedSignals) return "";
  const missedGoal = bridgeContext.sharedSignals.missedGoals?.[0];
  const recentStart = bridgeContext.sharedSignals.recentStart?.[0];
  if (activeAppSpace === appSpaceIds.wellness && missedGoal?.title) {
    return ` "${missedGoal.title}" may need no-shame recovery rather than more pressure.`;
  }
  if (activeAppSpace === appSpaceIds.adhd && bridgeContext.sharedSignals.latestMood) {
    return ` ${String(bridgeContext.sharedSignals.latestMood).toLowerCase()} may be part of the load.`;
  }
  if (activeAppSpace === appSpaceIds.adhd && recentStart?.task) {
    return ` Your recent Start history points to "${recentStart.task}" as a useful place to begin.`;
  }
  return "";
}

function moduleLabel(moduleId) {
  const labels = {
    "grounding-54321": "Grounding 5-4-3-2-1",
    "breathing-box": "Breathing space",
    "behavioral-activation": "Behavioral activation",
    "self-compassion": "Self-compassion reset",
    "sleep-reset": "Sleep reset",
    "communication-rehearsal": "Communication rehearsal",
    "rumination-worry-window": "Worry window",
    "cbt-thought-record": "CBT thought record",
  };
  return labels[moduleId] || "a structured support tool";
}
