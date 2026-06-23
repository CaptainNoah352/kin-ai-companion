import { BookOpen, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const emptyDraft = {
  title: "",
  mood: "",
  text: "",
};

export function createJournalEntry(draft) {
  const text = draft.text.trim();
  if (!text) return null;

  const now = new Date().toISOString();
  return {
    id: globalThis.crypto?.randomUUID?.() || `journal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: draft.title.trim() || "Untitled reflection",
    mood: draft.mood.trim(),
    text,
    createdAt: now,
    updatedAt: now,
  };
}

export function JournalCenter({ entries, setEntries }) {
  const [draft, setDraft] = useState(emptyDraft);
  const safeEntries = Array.isArray(entries) ? entries : [];
  const sortedEntries = useMemo(
    () => [...safeEntries].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)),
    [safeEntries],
  );

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveEntry() {
    const entry = createJournalEntry(draft);
    if (!entry) return;
    setEntries((current) => [entry, ...(Array.isArray(current) ? current : [])]);
    setDraft(emptyDraft);
  }

  function deleteEntry(entryId) {
    setEntries((current) => (Array.isArray(current) ? current.filter((entry) => entry.id !== entryId) : []));
  }

  return (
    <section className="journal-layout">
      <section className="surface-section">
        <div className="section-heading">
          <div>
            <h2>Journal</h2>
            <p>Private local reflections stored in this browser.</p>
          </div>
          <BookOpen size={22} />
        </div>

        <div className="form-grid">
          <label className="field-block">
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              placeholder="Optional title"
            />
          </label>
          <label className="field-block">
            <span>Mood or theme</span>
            <input
              value={draft.mood}
              onChange={(event) => updateDraft("mood", event.target.value)}
              placeholder="Example: anxious, hopeful, tired"
            />
          </label>
          <label className="field-block">
            <span>Reflection</span>
            <textarea
              value={draft.text}
              onChange={(event) => updateDraft("text", event.target.value)}
              placeholder="Write what you want to get out of your head..."
            />
          </label>
        </div>

        <button className="primary-button primary-button--auto" type="button" onClick={saveEntry} disabled={!draft.text.trim()}>
          <Save size={17} />
          Save entry
        </button>
      </section>

      <section className="surface-section">
        <div className="section-heading">
          <div>
            <h2>Saved entries</h2>
            <p>Delete entries anytime from here or the privacy center.</p>
          </div>
          <Plus size={22} />
        </div>

        <div className="journal-entry-list">
          {sortedEntries.length ? (
            sortedEntries.map((entry) => (
              <article className="journal-entry" key={entry.id}>
                <div>
                  <strong>{entry.title}</strong>
                  <small>
                    {new Date(entry.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {entry.mood ? ` - ${entry.mood}` : ""}
                  </small>
                </div>
                <p>{entry.text}</p>
                <button className="icon-text-button" type="button" onClick={() => deleteEntry(entry.id)}>
                  <Trash2 size={15} />
                  Delete
                </button>
              </article>
            ))
          ) : (
            <p className="empty">No journal entries yet.</p>
          )}
        </div>
      </section>
    </section>
  );
}
