import "dotenv/config";
import { pbkdf2, timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import express from "express";
import cors from "cors";
import { AI_COACH_SYSTEM_PROMPT } from "./src/features/aiCoach/aiCoachPrompts.js";
import { classifyCoachBoundary, createCoachReply, recommendModules } from "./src/features/aiCoach/aiCoachService.js";
import { buildSafetyResponse, classifySafety, shouldPauseForSafety } from "./src/features/safety/safetyRouter.js";
import { buildAppSpacePromptContext } from "./src/features/appSpaces/appSpaceService.js";
import { normalizeBreakdownResponse, normalizeSpiciness } from "./src/features/adhdTasks/adhdTaskService.js";
import { buildTaskBreakdownMessages } from "./src/features/adhdTasks/taskBreakdownClient.js";
import { buildModeSuggestion, buildSupportModePromptContext } from "./src/features/supportModes/supportModeService.js";
import { getRuntimeStatus, safetyRouterVersion } from "./runtimeStatus.mjs";

const modulePath = fileURLToPath(import.meta.url);
const moduleDir = dirname(modulePath);
const app = express();
const port = Number(process.env.PORT || 8787);
const appPort = Number(process.env.KIN_APP_PORT || 988);
const serveStatic = process.env.KIN_SERVE_STATIC === "1";
const serverHost = process.env.KIN_SERVER_HOST || (serveStatic ? "0.0.0.0" : "127.0.0.1");
const openRouterApiUrl = "https://openrouter.ai/api/v1/chat/completions";
const pbkdf2Async = promisify(pbkdf2);

app.use(securityHeaders);
app.use(cors({ origin: isAllowedCorsOrigin }));
app.use(express.json({ limit: "1mb" }));

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
}

function getConfiguredOrigins() {
  return [
    process.env.KIN_ALLOWED_ORIGINS,
    process.env.VITE_KIN_REMOTE_ORIGIN,
    process.env.OPENROUTER_SITE_URL,
  ]
    .flatMap((value) => String(value || "").split(","))
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function isAllowedCorsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    const allowed =
      getConfiguredOrigins().includes(origin.replace(/\/$/, "")) ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".ts.net") ||
      isPrivateLanHost(host) ||
      isTailscaleIpv4(host);
    callback(null, allowed);
  } catch {
    callback(null, false);
  }
}

function isPrivateLanHost(host) {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  const [first, second] = parts;
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function isTailscaleIpv4(host) {
  const parts = host.split(".").map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) && parts[0] === 100;
}

function getAiProvider() {
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL) {
    return "openrouter";
  }

  if (process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL) {
    return "openai";
  }

  return "demo";
}

function sanitizeText(value, maxLength = 600) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeMemory(memory) {
  if (!memory || typeof memory !== "object") return null;

  const summaries = Array.isArray(memory.summaries)
    ? memory.summaries
        .slice(0, 5)
        .map((summary) => ({
          text: sanitizeText(summary?.text, 400),
          createdAt: sanitizeText(summary?.createdAt, 40),
        }))
        .filter((summary) => summary.text)
    : [];

  const sanitized = {
    aboutMe: sanitizeText(memory.aboutMe),
    supportStyle: sanitizeText(memory.supportStyle),
    importantContext: sanitizeText(memory.importantContext),
    summaries,
  };

  return Object.values(sanitized).some((value) => (Array.isArray(value) ? value.length : value)) ? sanitized : null;
}

function normalizeIterations(iterations) {
  const numeric = Number(iterations);
  if (!Number.isFinite(numeric)) return 120000;
  return Math.min(250000, Math.max(1000, Math.floor(numeric)));
}

function isBase64(value) {
  return typeof value === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length >= 16;
}

async function deriveAppLockVerifier(passcode, salt, iterations) {
  const normalizedIterations = normalizeIterations(iterations);
  const key = await pbkdf2Async(passcode, Buffer.from(salt, "base64"), normalizedIterations, 32, "sha256");
  return {
    algorithm: "PBKDF2-SHA256",
    iterations: normalizedIterations,
    verifier: key.toString("base64"),
  };
}

function timingSafeStringEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return nodeTimingSafeEqual(leftBuffer, rightBuffer);
}

async function chatReply({
  messages,
  mood,
  latestCheckIn,
  memory,
  region,
  supportModes,
  manualChatMode = "Support",
  suggestedChatMode,
  activeAppSpace = "wellness",
  bridgeContext = null,
}) {
  const latest = messages.at(-1)?.content || "";
  const safety = classifySafety(latest, { source: "ai_chat" });

  if (shouldPauseForSafety(safety)) {
    return buildSafetyResponse(safety, region);
  }

  const boundary = classifyCoachBoundary(latest);
  const provider = getAiProvider();
  const safeMemory = sanitizeMemory(memory);
  const modeSuggestion = buildModeSuggestion(latest, { manualChatMode, latestCheckIn });
  const resolvedSupportModes = Array.isArray(supportModes) && supportModes.length ? supportModes : modeSuggestion.modes;
  const resolvedSuggestedChatMode = suggestedChatMode || modeSuggestion.suggestedChatMode;
  if (boundary !== "none" || provider === "demo") {
    return createCoachReply({
      text: latest,
      mood,
      latestCheckIn,
      memory: safeMemory,
      region,
      supportModes: resolvedSupportModes,
      manualChatMode,
      suggestedChatMode: resolvedSuggestedChatMode,
      activeAppSpace,
      bridgeContext,
    });
  }

  const conversation = messages.slice(-12).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  const promptParts = [
    AI_COACH_SYSTEM_PROMPT,
    `Current mood check-in: ${mood || "not set"}.`,
    `Recent check-in JSON: ${JSON.stringify(latestCheckIn || {})}.`,
    `Personal memory JSON: ${JSON.stringify(safeMemory || {})}. Use only as context; do not claim certainty from it.`,
    buildSupportModePromptContext({
      supportModes: resolvedSupportModes,
      manualChatMode,
      suggestedChatMode: resolvedSuggestedChatMode,
    }),
    buildAppSpacePromptContext({ activeAppSpace, bridgeContext }),
    "Keep the response concise. Recommend app tools by name when useful.",
  ];

  const text = provider === "openrouter"
    ? await openRouterReply(promptParts, conversation)
    : await openAiReply(promptParts, conversation);

  return {
    role: "assistant",
    content: text,
    safetyLevel: safety.level,
    recommendedModuleIds: recommendModules({ text: latest, latestCheckIn }),
    supportModes: resolvedSupportModes,
    suggestedChatMode: resolvedSuggestedChatMode,
    activeAppSpace,
    explanation: `Server generated response with ${provider} after safety and boundary checks.`,
  };
}

async function openRouterReply(promptParts, conversation) {
  const response = await fetch(openRouterApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://127.0.0.1:988",
      "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "Kin Mental Wellness Companion",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: [
        {
          role: "system",
          content: promptParts.join("\n\n"),
        },
        ...conversation,
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenRouter request failed: ${response.status} ${details}`);
  }

  const data = await response.json();
  return (
    data.choices?.[0]?.message?.content ||
    "I am here with you. Could you say that another way so I can follow you better?"
  );
}

async function openRouterTaskBreakdown({ task, spiciness }) {
  const response = await fetch(openRouterApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://127.0.0.1:988",
      "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "Kin Mental Wellness Companion",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: buildTaskBreakdownMessages({ task, spiciness }),
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter task breakdown failed: ${response.status}`);
  }

  const data = await response.json();
  return normalizeBreakdownResponse(data.choices?.[0]?.message?.content || "", task);
}

async function openAiReply(promptParts, conversation) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL,
      instructions: promptParts.join("\n\n"),
      input: conversation,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${details}`);
  }

  const data = await response.json();
  return (
    data.output_text ||
    data.output?.flatMap((item) => item.content || []).find((part) => part.text)?.text ||
    "I am here with you. Could you say that another way so I can follow you better?"
  );
}

async function openAiTaskBreakdown({ task, spiciness }) {
  const messages = buildTaskBreakdownMessages({ task, spiciness });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL,
      instructions: messages[0].content,
      input: messages[1].content,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI task breakdown failed: ${response.status}`);
  }

  const data = await response.json();
  const text =
    data.output_text ||
    data.output?.flatMap((item) => item.content || []).find((part) => part.text)?.text ||
    "";
  return normalizeBreakdownResponse(text, task);
}

export async function taskBreakdown({ task, spiciness }) {
  const provider = getAiProvider();
  if (provider === "demo") {
    const error = new Error("Task breakdown requires a real AI provider.");
    error.statusCode = 409;
    throw error;
  }
  return provider === "openrouter"
    ? openRouterTaskBreakdown({ task, spiciness })
    : openAiTaskBreakdown({ task, spiciness });
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    ai: getAiProvider(),
    safetyRouter: safetyRouterVersion,
  });
});

app.get("/api/runtime/status", async (_req, res) => {
  const status = await getRuntimeStatus({
    api: {
      ok: true,
      ai: getAiProvider(),
      safetyRouter: safetyRouterVersion,
    },
    appPort,
    desktop: {
      running: process.env.KIN_DESKTOP === "1",
      mode: process.env.KIN_DESKTOP_MODE || (serveStatic ? "desktop" : "web"),
      windowUrl: process.env.KIN_DESKTOP_WINDOW_URL || "",
    },
  });

  res.json(status);
});

app.post("/api/safety/classify", (req, res) => {
  const input = typeof req.body.input === "string" ? req.body.input : "";
  const source = typeof req.body.source === "string" ? req.body.source : "ai_chat";
  res.json(classifySafety(input, { source }));
});

app.post("/api/app-lock/derive", async (req, res) => {
  try {
    const passcode = typeof req.body.passcode === "string" ? req.body.passcode : "";
    const salt = typeof req.body.salt === "string" ? req.body.salt : "";
    if (passcode.length < 6 || !isBase64(salt)) {
      return res.status(400).json({ error: "Valid passcode and salt are required." });
    }

    res.json(await deriveAppLockVerifier(passcode, salt, req.body.iterations));
  } catch (error) {
    console.error("App lock verifier failed:", error.message);
    res.status(500).json({ error: "App lock verifier could not be created." });
  }
});

app.post("/api/app-lock/verify", async (req, res) => {
  try {
    const passcode = typeof req.body.passcode === "string" ? req.body.passcode : "";
    const salt = typeof req.body.salt === "string" ? req.body.salt : "";
    const verifier = typeof req.body.verifier === "string" ? req.body.verifier : "";
    if (passcode.length < 1 || !isBase64(salt) || !verifier) {
      return res.json({ ok: false });
    }

    const derived = await deriveAppLockVerifier(passcode, salt, req.body.iterations);
    res.json({ ok: timingSafeStringEqual(derived.verifier, verifier) });
  } catch (error) {
    console.error("App lock verification failed:", error.message);
    res.status(500).json({ error: "App lock passcode could not be verified." });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const mood = typeof req.body.mood === "string" ? req.body.mood : "";
    const latestCheckIn = req.body.latestCheckIn && typeof req.body.latestCheckIn === "object" ? req.body.latestCheckIn : null;
    const memory = req.body.memory && typeof req.body.memory === "object" ? req.body.memory : null;
    const region = typeof req.body.region === "string" ? req.body.region : "US";
    const supportModes = Array.isArray(req.body.supportModes) ? req.body.supportModes : [];
    const manualChatMode = typeof req.body.manualChatMode === "string" ? req.body.manualChatMode : "Support";
    const suggestedChatMode = typeof req.body.suggestedChatMode === "string" ? req.body.suggestedChatMode : "";
    const activeAppSpace = typeof req.body.activeAppSpace === "string" ? req.body.activeAppSpace : "wellness";
    const bridgeContext = req.body.bridgeContext && typeof req.body.bridgeContext === "object" ? req.body.bridgeContext : null;

    if (!messages.length) {
      return res.status(400).json({ error: "No messages were provided." });
    }

    const reply = await chatReply({
      messages,
      mood,
      latestCheckIn,
      memory,
      region,
      supportModes,
      manualChatMode,
      suggestedChatMode,
      activeAppSpace,
      bridgeContext,
    });
    res.json(reply);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Kin had trouble responding. Try again in a moment.",
    });
  }
});

app.post("/api/adhd/tasks/breakdown", async (req, res) => {
  try {
    const task = sanitizeText(req.body.task, 500);
    const spiciness = normalizeSpiciness(req.body.spiciness);
    if (!task) {
      return res.status(400).json({ error: "A task is required." });
    }

    res.json(await taskBreakdown({ task, spiciness }));
  } catch (error) {
    console.error("Task breakdown failed:", error.message);
    res.status(error.statusCode || 500).json({
      error: error.statusCode === 409
        ? "Task breakdown needs OpenRouter or OpenAI configured."
        : "Task breakdown could not be created. Try again in a moment.",
    });
  }
});

if (serveStatic) {
  const staticDir = resolve(moduleDir, "dist");
  const indexPath = resolve(staticDir, "index.html");

  if (existsSync(indexPath)) {
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/")) {
        next();
        return;
      }

      res.sendFile(indexPath);
    });
  } else {
    console.warn(`Kin static app was not found at ${indexPath}. Run npm.cmd run build first.`);
  }
}

export function startKinServer({ listenPort = port, host = serverHost } = {}) {
  return new Promise((resolveStart, rejectStart) => {
    const server = app.listen(listenPort, host, () => {
      const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
      const mode = serveStatic ? "app" : "API";
      console.log(`Kin ${mode} running at http://${displayHost}:${listenPort}`);
      resolveStart(server);
    });

    server.once("error", rejectStart);
  });
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(resolve(process.argv[1])) === realpathSync(modulePath);
  } catch {
    return resolve(process.argv[1]) === modulePath;
  }
}

if (isDirectRun()) {
  startKinServer().catch((error) => {
    console.error("Kin server failed to start:", error);
    process.exitCode = 1;
  });
}
