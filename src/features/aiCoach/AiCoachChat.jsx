import { Brain, RotateCcw, Send, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createCoachReply } from "./aiCoachService.js";
import { buildCoachChatPayload } from "./chatPayload.js";
import { createOpenRouterBrowserReply } from "./openRouterClient.js";
import { formatKinApiError, postKinApiJson } from "../../lib/kinApiClient.js";
import { shouldUseKinApiBackend } from "../../lib/runtimeMode.js";
import { buildConversationSummary, MEMORY_SUMMARY_MIN_LENGTH } from "../memory/memoryService.js";
import { classifySafety, shouldPauseForSafety } from "../safety/safetyRouter.js";
import { buildModeSuggestion, chatModes } from "../supportModes/supportModeService.js";

const starterMessages = [
  {
    role: "assistant",
    content:
      "I am Kin. I can support reflection and coping tools, but I am AI support, not therapy. I do not diagnose, prescribe, or handle emergencies.",
    recommendedModuleIds: [],
  },
];

export function AiCoachChat({
  messages,
  setMessages,
  mood,
  latestCheckIn,
  memory,
  region,
  onSafety,
  onOpenModule,
  onAutoSaveMemory,
  userOpenRouter,
  consent,
  chatMode = "Support",
  onChatModeChange,
  activeAppSpace = "wellness",
  appTitle = "Chat",
  bridgeContext = null,
}) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [modeSuggestion, setModeSuggestion] = useState(null);
  const [apiNotice, setApiNotice] = useState("");
  const endRef = useRef(null);
  const lastAutoSavedRef = useRef("");
  const visibleMessages = messages.length ? messages : starterMessages;
  const generatedSummary = useMemo(() => buildConversationSummary(messages), [messages]);
  const hasUserMessage = messages.some((message) => message.role === "user");
  const hasAssistantAfterUser = messages.some(
    (message, index) => message.role === "assistant" && messages.slice(0, index).some((item) => item.role === "user"),
  );
  const canAutoSaveMemory =
    hasUserMessage && hasAssistantAfterUser && generatedSummary.length >= MEMORY_SUMMARY_MIN_LENGTH;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  // Auto-save the conversation to local memory in the background. One evolving
  // summary per chat (replaced as it grows), no manual save needed.
  useEffect(() => {
    if (!canAutoSaveMemory) return undefined;
    if (generatedSummary === lastAutoSavedRef.current) return undefined;
    const timer = setTimeout(() => {
      onAutoSaveMemory?.(generatedSummary);
      lastAutoSavedRef.current = generatedSummary;
    }, 1500);
    return () => clearTimeout(timer);
  }, [generatedSummary, canAutoSaveMemory, onAutoSaveMemory]);

  function resetChat() {
    lastAutoSavedRef.current = "";
    setMessages(starterMessages);
  }

  async function sendMessage(text = input) {
    const trimmed = text.trim();
    if (!trimmed || isSending || !consent?.aiDisclosureAccepted) return;

    const safety = classifySafety(trimmed, { source: "ai_chat" });
    if (shouldPauseForSafety(safety)) {
      onSafety(trimmed, "ai_chat");
      setMessages((current) => [
        ...current,
        { role: "user", content: trimmed },
        {
          role: "assistant",
          content: "Normal AI coaching is paused while the safety flow opens.",
          safetyLevelAtGeneration: safety.level,
          recommendedModuleIds: ["safety-plan"],
        },
      ]);
      setInput("");
      return;
    }

    const suggestion = buildModeSuggestion(trimmed, { manualChatMode: chatMode, latestCheckIn });
    setModeSuggestion(suggestion);
    const userMessage = {
      role: "user",
      content: trimmed,
      supportModes: suggestion.modes,
      manualChatMode: chatMode,
      suggestedChatMode: suggestion.suggestedChatMode,
      emotionalAvoidance: suggestion.emotionalAvoidance,
      activeAppSpace,
    };
    const nextMessages = [...visibleMessages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setApiNotice("");
    const payload = buildCoachChatPayload({
      messages: nextMessages,
      mood,
      latestCheckIn,
      memory,
      region,
      consent,
      supportModes: suggestion.modes,
      manualChatMode: chatMode,
      suggestedChatMode: suggestion.suggestedChatMode,
      activeAppSpace,
      bridgeContext,
    });

    const usesKinApiBackend = shouldUseKinApiBackend();

    try {
      const data = usesKinApiBackend
          ? await fetchServerCoachReply(payload, { onStatus: setApiNotice })
          : userOpenRouter?.apiKey
            ? await createOpenRouterBrowserReply({ payload, userOpenRouter })
          : createCoachReply({
              text: trimmed,
              mood,
              latestCheckIn,
              memory: payload.memory,
              region,
              supportModes: suggestion.modes,
              manualChatMode: chatMode,
              suggestedChatMode: suggestion.suggestedChatMode,
              activeAppSpace,
              bridgeContext,
            });
      if (data.blocked || data.safety?.level === "high" || data.safety?.level === "imminent") {
        onSafety(trimmed, "ai_chat");
      }
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.content,
          safetyLevelAtGeneration: data.safetyLevel || data.safety?.level || "none",
          recommendedModuleIds: data.recommendedModuleIds || [],
          supportModes: data.supportModes || suggestion.modes,
          suggestedChatMode: data.suggestedChatMode || suggestion.suggestedChatMode,
          activeAppSpace: data.activeAppSpace || activeAppSpace,
        },
      ]);
    } catch (error) {
      if (usesKinApiBackend) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content: formatKinApiError(
              error,
              "Kin could not reach the AI server, so the real chat model did not respond. Check that the Kin API is running, then try again.",
            ),
            safetyLevelAtGeneration: "none",
            recommendedModuleIds: [],
            supportModes: suggestion.modes,
            suggestedChatMode: suggestion.suggestedChatMode,
            activeAppSpace,
          },
        ]);
        return;
      }

      const fallback = createCoachReply({
        text: trimmed,
        mood,
        latestCheckIn,
        memory: payload.memory,
        region,
        supportModes: suggestion.modes,
        manualChatMode: chatMode,
        suggestedChatMode: suggestion.suggestedChatMode,
        activeAppSpace,
        bridgeContext,
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: fallback.content,
          safetyLevelAtGeneration: fallback.safetyLevel || fallback.safety?.level || "none",
          recommendedModuleIds: fallback.recommendedModuleIds || [],
          supportModes: fallback.supportModes || suggestion.modes,
          suggestedChatMode: fallback.suggestedChatMode || suggestion.suggestedChatMode,
          activeAppSpace: fallback.activeAppSpace || activeAppSpace,
        },
      ]);
    } finally {
      setApiNotice("");
      setIsSending(false);
    }
  }

  return (
    <section className="surface-section coach-section">
      <div className="section-heading">
        <h2>{appTitle}</h2>
        <p>
          <ShieldAlert size={15} /> AI support, not therapy. Not for emergencies.
        </p>
      </div>

      <div className="chat-mode-selector" role="radiogroup" aria-label="Chat support mode">
        {chatModes.map((mode) => (
          <button
            className={chatMode === mode.id ? "chat-mode-chip active" : "chat-mode-chip"}
            type="button"
            role="radio"
            aria-checked={chatMode === mode.id}
            key={mode.id}
            onClick={() => onChatModeChange?.(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {modeSuggestion && (
        <div className="mode-suggestion" aria-live="polite">
          <span>{modeSuggestion.copy}</span>
          {chatModes.some((mode) => mode.id === modeSuggestion.suggestedChatMode) &&
            modeSuggestion.suggestedChatMode !== chatMode && (
              <button type="button" onClick={() => onChatModeChange?.(modeSuggestion.suggestedChatMode)}>
                Use {modeSuggestion.suggestedChatMode}
              </button>
            )}
        </div>
      )}

      {!consent?.aiDisclosureAccepted && (
        <div className="notice-strip">AI disclosure must be accepted before using Chat.</div>
      )}

      <div className="chat-window" aria-live="polite">
        {visibleMessages.map((message, index) => (
          <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
            <div className="message-avatar">{message.role === "assistant" ? <Brain size={18} /> : "You"}</div>
            <div className="message-body">
              <p>{message.content}</p>
              {message.suggestedChatMode && (
                <small className="message-mode-note">Suggested mode: {message.suggestedChatMode}</small>
              )}
              {!!message.recommendedModuleIds?.length && (
                <div className="tool-suggestion-row">
                  {message.recommendedModuleIds.map((moduleId) => (
                    <button key={moduleId} type="button" onClick={() => onOpenModule(moduleId)}>
                      Open {friendlyModuleName(moduleId)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
        {isSending && (
          <article className="message assistant">
            <div className="message-avatar">
              <Brain size={18} />
            </div>
            <div className="message-body">
              <p>{apiNotice || "Kin is checking boundaries and choosing a safe next step..."}</p>
            </div>
          </article>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Share what you want support with..."
          aria-label="Message Kin"
        />
        <button type="submit" disabled={isSending || !input.trim()} aria-label="Send message">
          <Send size={20} />
        </button>
      </form>

      <div className="coach-footer">
        <button className="ghost-button ghost-button--inline" type="button" onClick={resetChat}>
          <RotateCcw size={16} />
          Reset chat
        </button>
      </div>
    </section>
  );
}

async function fetchServerCoachReply(payload, { onStatus } = {}) {
  return postKinApiJson("/api/chat", payload, { onStatus });
}

function friendlyModuleName(moduleId) {
  return moduleId
    .replace("54321", "5-4-3-2-1")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
