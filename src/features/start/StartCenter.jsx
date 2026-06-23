import { CheckCircle2, MessageCircle, Play, RotateCcw, Timer, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  completeStartSession,
  createStartSession,
  markStartSessionStuck,
  summarizeStartSessions,
} from "./startSessionService.js";

const emptyDraft = {
  task: "",
  tinyStep: "",
  minutes: 5,
  bodyDoubling: false,
};

export function StartCenter({ sessions, setSessions, suggestedTask = "", onOpenChatMode }) {
  const [draft, setDraft] = useState(() => ({ ...emptyDraft, task: suggestedTask || "" }));
  const [smallerSteps, setSmallerSteps] = useState({});
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const stats = useMemo(() => summarizeStartSessions(safeSessions), [safeSessions]);
  const activeSession = safeSessions.find((session) => session.status === "running");
  const recentSessions = safeSessions.slice(0, 6);

  useEffect(() => {
    if (!suggestedTask) return;
    setDraft((current) => ({ ...current, task: suggestedTask }));
  }, [suggestedTask]);

  function startSession(overrides = {}) {
    const nextDraft = { ...draft, ...overrides };
    if (!nextDraft.task.trim()) return;
    const session = createStartSession(nextDraft);
    setSessions((current) => [session, ...(Array.isArray(current) ? current : [])]);
  }

  function updateSession(sessionId, updater) {
    setSessions((current) =>
      (Array.isArray(current) ? current : []).map((session) => (session.id === sessionId ? updater(session) : session)),
    );
  }

  return (
    <section className="surface-section start-section">
      <div className="section-heading">
        <h2>Start</h2>
        <p>Use a small launch point when the task feels too big, boring, emotional, or unclear.</p>
      </div>

      <div className="start-layout">
        <section className="start-card start-card--primary">
          <div className="start-card__heading">
            <Timer size={21} />
            <h3>Start a 5-minute task</h3>
          </div>
          <label className="field-block">
            <span>What are you avoiding?</span>
            <input
              value={draft.task}
              onChange={(event) => setDraft((current) => ({ ...current, task: event.target.value }))}
              placeholder="Example: open the bill, reply to Alex, clear the desk"
            />
          </label>
          <label className="field-block">
            <span>First tiny action</span>
            <input
              value={draft.tinyStep}
              onChange={(event) => setDraft((current) => ({ ...current, tinyStep: event.target.value }))}
              placeholder="Make it small enough to start"
            />
          </label>
          <div className="start-options">
            <label>
              <span>Minutes</span>
              <select
                value={draft.minutes}
                onChange={(event) => setDraft((current) => ({ ...current, minutes: Number(event.target.value) }))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.bodyDoubling}
                onChange={(event) => setDraft((current) => ({ ...current, bodyDoubling: event.target.checked }))}
              />
              Body doubling
            </label>
          </div>
          <div className="button-row">
            <button className="primary-button primary-button--auto" type="button" onClick={() => startSession()} disabled={!draft.task.trim()}>
              <Play size={16} />
              Start now
            </button>
            <button
              className="secondary-button secondary-button--auto"
              type="button"
              onClick={() => startSession({ minutes: 5, bodyDoubling: true })}
              disabled={!draft.task.trim()}
            >
              <UsersRound size={16} />
              Body double
            </button>
          </div>
        </section>

        <aside className="start-card body-double-card">
          <UsersRound size={24} />
          <h3>Body doubling</h3>
          <p>
            Keep Kin open beside you while you do the first tiny action. This is an optional focus support, not a treatment
            claim.
          </p>
          <button className="ghost-button" type="button" onClick={() => onOpenChatMode?.("Focus")}>
            <MessageCircle size={16} />
            Ask for focus support
          </button>
        </aside>
      </div>

      {activeSession && (
        <section className="active-start-session" aria-label="Active start session">
          <div>
            <strong>{activeSession.task}</strong>
            <p>
              {activeSession.minutes} minutes - {activeSession.bodyDoubling ? "body doubling on" : "solo start"} - next:{" "}
              {activeSession.tinyStep}
            </p>
          </div>
          <div className="button-row">
            <button className="primary-button primary-button--auto" type="button" onClick={() => updateSession(activeSession.id, completeStartSession)}>
              <CheckCircle2 size={16} />
              Done
            </button>
            <button
              className="secondary-button secondary-button--auto"
              type="button"
              onClick={() => updateSession(activeSession.id, (session) => markStartSessionStuck(session))}
            >
              <RotateCcw size={16} />
              I got stuck
            </button>
          </div>
        </section>
      )}

      <section className="start-history" aria-label="Start history">
        <div className="start-stats-row">
          <StatPill label="Started" value={stats.total} />
          <StatPill label="Done" value={stats.done} />
          <StatPill label="Stuck" value={stats.stuck} />
        </div>

        {recentSessions.map((session) => (
          <article className={`start-history-row start-history-row--${session.status}`} key={session.id}>
            <span>
              <strong>{session.task}</strong>
              <small>{session.status === "stuck" ? "No shame. Shrink and restart." : session.tinyStep}</small>
            </span>
            {session.status === "stuck" && (
              <div className="recovery-row">
                <input
                  value={smallerSteps[session.id] ?? ""}
                  onChange={(event) => setSmallerSteps((current) => ({ ...current, [session.id]: event.target.value }))}
                  placeholder="Smaller step"
                />
                <button
                  className="secondary-button secondary-button--auto"
                  type="button"
                  onClick={() => {
                    const smallerStep = smallerSteps[session.id] || session.smallerStep;
                    setDraft((current) => ({ ...current, task: session.task, tinyStep: smallerStep, minutes: 5 }));
                    updateSession(session.id, (current) => markStartSessionStuck(current, smallerStep));
                  }}
                >
                  Use step
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </section>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="stat-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
