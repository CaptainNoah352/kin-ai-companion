import { sanitizeMemoryForAi } from "../memory/memoryService.js";

export function buildCoachChatPayload({
  messages,
  mood,
  latestCheckIn,
  memory,
  region,
  consent,
  supportModes = [],
  manualChatMode = "Support",
  suggestedChatMode = "Support",
  activeAppSpace = "wellness",
  bridgeContext = null,
}) {
  return {
    messages,
    mood,
    latestCheckIn,
    memory: consent?.allowPersonalization ? sanitizeMemoryForAi(memory) : null,
    region,
    supportModes: Array.isArray(supportModes) ? supportModes : [],
    manualChatMode,
    suggestedChatMode,
    activeAppSpace,
    bridgeContext,
  };
}
