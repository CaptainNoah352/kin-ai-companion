import { BarChart3, CheckCircle2, MessageCircle, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { goalStats } from "../goals/goalService.js";
import { summarizeStartSessions } from "../start/startSessionService.js";
import { summarizeAdhdTasks } from "../adhdTasks/adhdTaskService.js";

const emptyDraft = {
  wins: "",
  friction: "",
  helped: "",
  nextTinyStep: "",
};

export function WeeklyReview({
  goals,
  adhdTasks,
  checkIns,
  startSessions,
  weeklyReviews,
  setWeeklyReviews,
  onOpenChatMode,
  onOpenGoals,
}) {
  const [draft, setDraft] = useState(emptyDraft);
  const safeReviews = Array.isArray(weeklyReviews) ? weeklyReviews : [];
  const goalSummary = useMemo(() => goalStats(goals), [goals]);
  const startSummary = useMemo(() => summarizeStartSessions(startSessions), [startSessions]);
  const taskSummary = useMemo(() => summarizeAdhdTasks(adhdTasks), [adhdTasks]);
  const checkInsThisWeek = useMemo(() => countItemsThisWeek(checkIns, "createdAt"), [checkIns]);
  const recentReviews = safeReviews.slice(0, 4);

  function saveReview() {
    const hasContent = Object.values(draft).some((value) => value.trim());
    if (!hasContent) return;
    setWeeklyReviews((current) => [
      {
        id: makeId("review"),
        ...draft,
        createdAt: new Date().toISOString(),
      },
      ...(Array.isArray(current) ? current : []),
    ]);
    setDraft(emptyDraft);
  }

  return (
    <section className="surface-section review-section">
      <div className="section-heading">
        <h2>Weekly Review</h2>
        <p>Look for patterns, recover missed plans, and choose one tiny step for the next week.</p>
      </div>

      <div className="review-summary-grid">
        <SummaryCard icon={CheckCircle2} label="Goals done" value={goalSummary.completedCount} />
        <SummaryCard icon={RotateCcw} label="Goal recoveries" value={goalSummary.recoveryCount} />
        <SummaryCard icon={BarChart3} label="Check-ins" value={checkInsThisWeek} />
        <SummaryCard icon={CheckCircle2} label="Tasks open" value={taskSummary.open} />
        <SummaryCard icon={CheckCircle2} label="Start sessions" value={startSummary.total} />
      </div>

      <section className="review-compose" aria-label="Create weekly review">
        <label className="field-block">
          <span>What worked?</span>
          <textarea
            value={draft.wins}
            onChange={(event) => setDraft((current) => ({ ...current, wins: event.target.value }))}
            placeholder="Small wins count."
          />
        </label>
        <label className="field-block">
          <span>What got in the way?</span>
          <textarea
            value={draft.friction}
            onChange={(event) => setDraft((current) => ({ ...current, friction: event.target.value }))}
            placeholder="Overwhelm, distraction, shame, unclear steps, timing..."
          />
        </label>
        <label className="field-block">
          <span>What helped?</span>
          <textarea
            value={draft.helped}
            onChange={(event) => setDraft((current) => ({ ...current, helped: event.target.value }))}
            placeholder="Body doubling, smaller steps, reminders, grounding..."
          />
        </label>
        <label className="field-block">
          <span>One tiny step for next week</span>
          <input
            value={draft.nextTinyStep}
            onChange={(event) => setDraft((current) => ({ ...current, nextTinyStep: event.target.value }))}
            placeholder="Make it small enough to start."
          />
        </label>
        <div className="button-row">
          <button className="primary-button primary-button--auto" type="button" onClick={saveReview}>
            Save review
          </button>
          <button className="secondary-button secondary-button--auto" type="button" onClick={() => onOpenChatMode?.("Support")}>
            <MessageCircle size={16} />
            Talk it through
          </button>
          <button className="ghost-button" type="button" onClick={onOpenGoals}>
            Review goals
          </button>
        </div>
      </section>

      <aside className="review-note">
        <strong>Missed goals are recovery data.</strong>
        <p>No streaks or shame language here. If something slipped, Kin uses it to make the next step smaller.</p>
      </aside>

      {!!recentReviews.length && (
        <section className="recent-reviews" aria-label="Recent weekly reviews">
          <h3>Recent reviews</h3>
          {recentReviews.map((review) => (
            <article className="review-row" key={review.id}>
              <strong>{formatDate(review.createdAt)}</strong>
              <p>{review.nextTinyStep || review.wins || review.friction}</p>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <article className="review-summary-card">
      <Icon size={18} />
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function countItemsThisWeek(items = [], dateKey = "createdAt") {
  const safeItems = Array.isArray(items) ? items : [];
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return safeItems.filter((item) => new Date(item?.[dateKey] || 0).getTime() >= weekAgo).length;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
