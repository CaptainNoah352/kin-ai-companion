export const chatStarterContent =
  "I am Kin. I can support reflection and coping tools, but I am AI support, not therapy. I do not diagnose, prescribe, or handle emergencies.";

export const starterMessages = [
  {
    role: "assistant",
    content: chatStarterContent,
    recommendedModuleIds: [],
  },
];

export function normalizeChatHistory(messages) {
  const source = Array.isArray(messages) ? messages : [];
  let firstRealMessageIndex = 0;

  while (firstRealMessageIndex < source.length && isStarterMessage(source[firstRealMessageIndex])) {
    firstRealMessageIndex += 1;
  }

  return firstRealMessageIndex === 0 ? source : source.slice(firstRealMessageIndex);
}

export function isStarterMessage(message) {
  return message?.role === "assistant" && message?.content === chatStarterContent;
}
