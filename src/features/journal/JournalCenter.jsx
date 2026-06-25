import { BookOpen, Feather, MoreHorizontal, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const safeEntries = Array.isArray(entries) ? entries : [];
  const sortedEntries = useMemo(
    () => [...safeEntries].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)),
    [safeEntries],
  );

  useEffect(() => {
    if (!openMenuId) return undefined;
    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openMenuId]);

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
      <section className="surface-section diary-page">
        <header className="diary-page__head">
          <div>
            <span className="diary-page__date">{formatDiaryDate(new Date())}</span>
            <h2>Today's page</h2>
          </div>
          <Feather size={22} />
        </header>

        <div className="diary-sheet">
          <textarea
            className="diary-input"
            value={draft.text}
            onChange={(event) => updateDraft("text", event.target.value)}
            placeholder="Dear diary, today I..."
            aria-label="Diary entry"
          />
        </div>

        <div className="diary-meta">
          <label className="field-block">
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              placeholder="Give today a title (optional)"
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
        </div>

        <button className="primary-button primary-button--auto" type="button" onClick={saveEntry} disabled={!draft.text.trim()}>
          <Save size={17} />
          Save today's entry
        </button>
        <p className="diary-page__note">Private local reflections, stored only in this browser.</p>
      </section>

      <section className="surface-section">
        <div className="section-heading">
          <div>
            <h2>Past pages</h2>
            <p>{sortedEntries.length ? `${sortedEntries.length} entr${sortedEntries.length === 1 ? "y" : "ies"} in your diary.` : "Your diary is waiting for its first page."}</p>
          </div>
          <BookOpen size={22} />
        </div>

        <div className="diary-entry-list">
          {sortedEntries.length ? (
            sortedEntries.map((entry) => (
              <article className="diary-entry" key={entry.id}>
                <header className="diary-entry__head">
                  <span className="diary-entry__date">{formatDiaryDate(new Date(entry.createdAt))}</span>
                  <span className="diary-entry__time">
                    {new Date(entry.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                  {entry.mood ? <span className="diary-entry__mood">{entry.mood}</span> : null}
                  <div
                    className={`diary-entry__menu-wrap${entry.mood ? "" : " diary-entry__menu-wrap--alone"}`}
                    ref={openMenuId === entry.id ? menuRef : null}
                  >
                    <button
                      className="diary-entry__menu-button"
                      type="button"
                      aria-label="Entry options"
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === entry.id}
                      onClick={() => setOpenMenuId((current) => (current === entry.id ? null : entry.id))}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {openMenuId === entry.id ? (
                      <div className="diary-entry__menu" role="menu">
                        <button
                          className="diary-entry__menu-item diary-entry__menu-item--danger"
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            deleteEntry(entry.id);
                            setOpenMenuId(null);
                          }}
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </header>
                <strong className="diary-entry__title">{entry.title}</strong>
                <p className="diary-entry__body">{entry.text}</p>
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

function formatDiaryDate(date) {
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
