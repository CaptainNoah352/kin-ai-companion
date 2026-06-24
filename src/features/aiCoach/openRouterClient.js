import { AI_COACH_SYSTEM_PROMPT } from "./aiCoachPrompts.js";
import { recommendModules } from "./aiCoachService.js";
import { buildAppSpacePromptContext } from "../appSpaces/appSpaceService.js";
import { buildSupportModePromptContext } from "../supportModes/supportModeService.js";

const openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";

export async function createOpenRouterBrowserReply({ payload, userOpenRouter }) {
  if (!userOpenRouter?.apiKey) {
    throw new Error("A user-owned OpenRouter key is required.");
  }

  const latest = payload.messages.at(-1)?.content || "";
  const response = await fetch(openRouterApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userOpenRouter.apiKey}`,
      "HTTP-Referer": userOpenRouter.siteUrl || globalThis.location?.origin || "https://kin.local",
      "X-OpenRouter-Title": userOpenRouter.appName || "Kin Mental Wellness Companion",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: userOpenRouter.model || "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
            AI_COACH_SYSTEM_PROMPT,
            `Current mood check-in: ${payload.mood || "not set"}.`,
            `Recent check-in JSON: ${JSON.stringify(payload.latestCheckIn || {})}.`,
            `Personal memory JSON: ${JSON.stringify(payload.memory || {})}. Use only as context; do not claim certainty from it.`,
            buildSupportModePromptContext({
              supportModes: payload.supportModes,
              manualChatMode: payload.manualChatMode,
              suggestedChatMode: payload.suggestedChatMode,
            }),
            buildAppSpacePromptContext({
              activeAppSpace: payload.activeAppSpace,
              bridgeContext: payload.bridgeContext,
            }),
            "Keep the response concise. Recommend app tools by name when useful.",
          ].join("\n\n"),
        },
        ...payload.messages.slice(-12).map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        })),
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`OpenRouter request failed: ${response.status} ${details}`);
  }

  const data = await response.json();
  return {
    role: "assistant",
    content:
      data.choices?.[0]?.message?.content ||
      "I am here with you. Could you say that another way so I can follow you better?",
    recommendedModuleIds: recommendModules({ text: latest, latestCheckIn: payload.latestCheckIn }),
    supportModes: payload.supportModes || [],
    suggestedChatMode: payload.suggestedChatMode || "Support",
    activeAppSpace: payload.activeAppSpace || "wellness",
    explanation: "Browser generated response with the user's own OpenRouter key.",
  };
}
