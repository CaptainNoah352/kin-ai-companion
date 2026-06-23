import { Brain, Check, FileText, Save, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addMemorySummary,
  buildConversationSummary,
  createDefaultMemory,
  getMemoryStats,
  MEMORY_SUMMARY_LIMIT,
  MEMORY_SUMMARY_MIN_LENGTH,
} from "./memoryService.js";

export function MemoryCenter({ memory, setMemory, messages }) {
  const normalizedMemory = useMemo(() => createDefaultMemory(memory), [memory]);
  const [draft, setDraft] = useState(normalizedMemory);
  const [customSummary, setCustomSummary] = useState("");
  const generatedSummary = useMemo(() => buildConversationSummary(messages), [messages]);
  const memoryStats = useMemo(() => getMemoryStats(normalizedMemory), [normalizedMemory]);
  const hasUserMessage = messages.some((message) => message.role === "user");
  const canSaveGeneratedSummary = hasUserMessage && generatedSummary.length >= MEMORY_SUMMARY_MIN_LENGTH;
  const canSaveCustomSummary = customSummary.trim().length >= MEMORY_SUMMARY_MIN_LENGTH;

  useEffect(() => {
    setDraft(normalizedMemory);
  }, [normalizedMemory]);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveProfile() {
    setMemory((current) => ({
      ...createDefaultMemory(current),
      aboutMe: draft.aboutMe,
      supportStyle: draft.supportStyle,
      importantContext: draft.importantContext,
      updatedAt: new Date().toISOString(),
    }));
  }

  function saveSummary(text) {
    if (text.trim().length < MEMORY_SUMMARY_MIN_LENGTH) return;
    setMemory((current) => addMemorySummary(current, text));
    setCustomSummary("");
  }

  function deleteSummary(summaryId) {
    setMemory((current) => {
      const next = createDefaultMemory(current);
      return {
        ...next,
        summaries: next.summaries.filter((summary) => summary.id !== summaryId),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  return (
    <section className="memory-layout">
      <section className="surface-section">
        <div className="section-heading">
          <div>
            <h2>About me / preferences</h2>
            <p>Local browser notes Kin can use for continuity when personalization is on.</p>
          </div>
          <UserRound size={22} />
        </div>

        <div className="memory-status-strip">
          <span>
            <strong>{memoryStats.summaryCount}</strong>
            Saved summaries
          </span>
          <span>
            <strong>{formatMemoryTimestamp(memoryStats.updatedAt)}</strong>
            Last updated
          </span>
          <span>
            <strong>This browser/device</strong>
            Export or delete from Privacy
          </span>
        </div>

        <div className="form-grid">
          <label className="field-block">
            <span>About me</span>
            <textarea
              value={draft.aboutMe}
              onChange={(event) => updateField("aboutMe", event.target.value)}
              placeholder="Examples: what matters to me, recurring stressors, people or routines I care about..."
            />
          </label>
          <label className="field-block">
            <span>How I like support</span>
            <textarea
              value={draft.supportStyle}
              onChange={(event) => updateField("supportStyle", event.target.value)}
              placeholder="Examples: be direct, be gentle, ask one question at a time, suggest grounding first..."
            />
          </label>
          <label className="field-block">
            <span>Important context</span>
            <textarea
              value={draft.importantContext}
              onChange={(event) => updateField("importantContext", event.target.value)}
              placeholder="Examples: sleep patterns, triggers, goals, support people, things I do not want to discuss..."
            />
          </label>
        </div>

        <button className="primary-button primary-button--auto" type="button" onClick={saveProfile}>
          <Save size={17} />
          Save profile memory
        </button>
      </section>

      <section className="surface-section">
        <div className="section-heading">
          <div>
            <h2>Conversation summaries</h2>
            <p>Save short summaries after review. Kin will not auto-save private chat details.</p>
          </div>
          <Brain size={22} />
        </div>

        <div className="summary-preview">
          <FileText size={20} />
          <div>
            <strong>Suggested summary from recent chat</strong>
            <p>{generatedSummary}</p>
            <button
              className="secondary-button secondary-button--auto"
              type="button"
              onClick={() => saveSummary(generatedSummary)}
              disabled={!canSaveGeneratedSummary}
            >
              <Check size={17} />
              Save suggested summary
            </button>
          </div>
        </div>

        <label className="field-block">
          <span>Add your own summary</span>
          <textarea
            value={customSummary}
            onChange={(event) => setCustomSummary(event.target.value)}
            placeholder="Write a short note Kin should remember..."
          />
        </label>
        <button
          className="ghost-button ghost-button--inline"
          type="button"
          onClick={() => saveSummary(customSummary)}
          disabled={!canSaveCustomSummary}
        >
          Add summary
        </button>
        {!canSaveCustomSummary && customSummary && (
          <p className="form-note">Add a little more detail before saving this memory.</p>
        )}

        <div className="memory-summary-list">
          {normalizedMemory.summaries.length ? (
            normalizedMemory.summaries.map((summary) => (
              <article className="simple-row memory-summary-row" key={summary.id}>
                <FileText size={18} />
                <span>
                  <strong>{new Date(summary.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</strong>
                  <small>{summary.text}</small>
                </span>
                <button className="icon-text-button" type="button" onClick={() => deleteSummary(summary.id)}>
                  Delete
                </button>
              </article>
            ))
          ) : (
            <p className="empty">No saved summaries yet. Up to {MEMORY_SUMMARY_LIMIT} local summaries are kept.</p>
          )}
        </div>
      </section>
    </section>
  );
}

function formatMemoryTimestamp(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Not updated yet";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
