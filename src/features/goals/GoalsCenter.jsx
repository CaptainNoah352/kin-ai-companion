import { CheckCircle2, MessageCircle, Plus, RotateCcw, Target, TimerReset } from "lucide-react";
import { useMemo, useState } from "react";
import {
  activeGoals,
  buildNoShameRecoveryCopy,
  completedGoals,
  createGoal,
  goalStats,
  markGoalDone,
  markGoalMissed,
  recoverGoal,
} from "./goalService.js";

const emptyDraft = { title: "", why: "", nextStep: "" };

export function GoalsCenter({ goals, setGoals, onOpenChatMode, onOpenStart }) {
  const [draft, setDraft] = useState(emptyDraft);
  const [recoveryDrafts, setRecoveryDrafts] = useState({});
  const active = useMemo(() => activeGoals(goals), [goals]);
  const completed = useMemo(() => completedGoals(goals).slice(0, 5), [goals]);
  const stats = useMemo(() => goalStats(goals), [goals]);

  function addGoal() {
    if (!draft.title.trim()) return;
    setGoals((current) => [createGoal(draft), ...(Array.isArray(current) ? current : [])]);
    setDraft(emptyDraft);
  }

  function updateGoal(goalId, updater) {
    setGoals((current) => (Array.isArray(current) ? current : []).map((goal) => (goal.id === goalId ? updater(goal) : goal)));
  }

  function markMissed(goal) {
    updateGoal(goal.id, (current) => markGoalMissed(current));
    setRecoveryDrafts((current) => ({
      ...current,
      [goal.id]: goal.nextStep ? `Make it smaller: ${goal.nextStep}` : "",
    }));
  }

  return (
    <section className="surface-section goals-section">
      <div className="section-heading">
        <h2>Goals</h2>
        <p>Track tiny steps with no-shame recovery when a plan slips.</p>
      </div>

      <div className="goal-stats-grid">
        <StatPill label="Active" value={stats.activeCount} />
        <StatPill label="Done" value={stats.completedCount} />
        <StatPill label="Recovered" value={stats.recoveryCount} />
      </div>

      <section className="goal-compose" aria-label="Create goal">
        <label className="field-block">
          <span>Goal</span>
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Example: finish the first email draft"
          />
        </label>
        <label className="field-block">
          <span>Why it matters</span>
          <input
            value={draft.why}
            onChange={(event) => setDraft((current) => ({ ...current, why: event.target.value }))}
            placeholder="Optional"
          />
        </label>
        <label className="field-block">
          <span>Next tiny step</span>
          <input
            value={draft.nextStep}
            onChange={(event) => setDraft((current) => ({ ...current, nextStep: event.target.value }))}
            placeholder="Open the doc and write one sentence"
          />
        </label>
        <button className="primary-button primary-button--auto" type="button" onClick={addGoal} disabled={!draft.title.trim()}>
          <Plus size={16} />
          Add goal
        </button>
      </section>

      <div className="goals-layout">
        <section className="goal-list" aria-label="Active goals">
          <h3>Today&apos;s tiny steps</h3>
          {!active.length && (
            <div className="empty-state">
              <Target size={26} />
              <p>No active goals yet. Add one tiny next step or start with a 5-minute task.</p>
            </div>
          )}
          {active.map((goal) => (
            <article className="goal-card" key={goal.id}>
              <div className="goal-card__body">
                <h4>{goal.title}</h4>
                {goal.why && <p>{goal.why}</p>}
                <small>Next: {goal.nextStep}</small>
              </div>
              <div className="goal-card__actions">
                <button className="primary-button primary-button--auto" type="button" onClick={() => updateGoal(goal.id, markGoalDone)}>
                  <CheckCircle2 size={16} />
                  Done
                </button>
                <button className="secondary-button secondary-button--auto" type="button" onClick={() => onOpenStart?.(goal.nextStep || goal.title)}>
                  <TimerReset size={16} />
                  Start
                </button>
                <button className="ghost-button" type="button" onClick={() => markMissed(goal)}>
                  Missed
                </button>
              </div>
              {goal.lastMissedAt && (
                <section className="recovery-panel" aria-label="No shame recovery">
                  <strong>No-shame recovery</strong>
                  <p>{buildNoShameRecoveryCopy(goal)}</p>
                  <div className="recovery-row">
                    <input
                      value={recoveryDrafts[goal.id] ?? ""}
                      onChange={(event) => setRecoveryDrafts((current) => ({ ...current, [goal.id]: event.target.value }))}
                      placeholder="Smaller next step"
                    />
                    <button
                      className="secondary-button secondary-button--auto"
                      type="button"
                      onClick={() => updateGoal(goal.id, (current) => recoverGoal(current, recoveryDrafts[goal.id]))}
                    >
                      <RotateCcw size={16} />
                      Recover
                    </button>
                  </div>
                </section>
              )}
            </article>
          ))}
        </section>

        <aside className="goal-support-panel">
          <h3>Support while working</h3>
          <p>Goals can include feelings, avoidance, and focus barriers. You do not have to choose one category first.</p>
          <div className="button-row">
            <button className="secondary-button secondary-button--auto" type="button" onClick={() => onOpenChatMode?.("Support")}>
              <MessageCircle size={16} />
              Talk it through
            </button>
            <button className="secondary-button secondary-button--auto" type="button" onClick={() => onOpenChatMode?.("Unblock")}>
              <RotateCcw size={16} />
              Unblock
            </button>
          </div>

          {!!completed.length && (
            <section className="completed-goals">
              <h4>Recently done</h4>
              {completed.map((goal) => (
                <p key={goal.id}>{goal.title}</p>
              ))}
            </section>
          )}
        </aside>
      </div>
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
