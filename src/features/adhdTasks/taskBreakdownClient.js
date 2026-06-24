import { normalizeBreakdownResponse, normalizeSpiciness } from "./adhdTaskService.js";

const openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";
export const taskBreakdownOpenRouterModel = "openrouter/free";

export async function createBrowserTaskBreakdown({ task, spiciness, userOpenRouter }) {
  if (!userOpenRouter?.apiKey) {
    throw new Error("A user-owned OpenRouter key is required for task breakdown.");
  }

  const response = await fetch(openRouterApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userOpenRouter.apiKey}`,
      "HTTP-Referer": userOpenRouter.siteUrl || globalThis.location?.origin || "https://kin.local",
      "X-OpenRouter-Title": userOpenRouter.appName || "Kin Mental Wellness Companion",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: taskBreakdownOpenRouterModel,
      messages: buildTaskBreakdownMessages({ task, spiciness }),
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`OpenRouter task breakdown failed: ${response.status} ${details}`);
  }

  const data = await response.json();
  return normalizeBreakdownResponse(data.choices?.[0]?.message?.content || "", task);
}

export function buildTaskBreakdownMessages({ task, spiciness }) {
  const level = normalizeSpiciness(spiciness);
  return [
    {
      role: "system",
      content: [
        "You break ADHD-hostile tasks into concrete, no-shame steps.",
        "Return only JSON with this shape: {\"title\":\"string\",\"category\":\"life|work|home|health|money|people|errands|learning|other\",\"estimateMinutes\":number,\"priority\":\"low|normal|high|urgent\",\"subtasks\":[{\"title\":\"string\",\"category\":\"...\",\"estimateMinutes\":number,\"priority\":\"...\",\"subtasks\":[]}]}",
        "Make every step visible and physically startable. Do not include clinical claims.",
        `Spiciness is ${level} out of 5. Higher spiciness means more, smaller steps.`,
      ].join("\n"),
    },
    {
      role: "user",
      content: String(task || "").slice(0, 500),
    },
  ];
}
