import { BarChart3, CalendarDays, Download, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { buildTrendSummary, filterCheckInsByDays, toPolylinePoints } from "./trendUtils.js";
import { HandoffSummary } from "../handoff/HandoffSummary.jsx";

export function ProgressDashboard({ checkIns, completedModules, carePlan }) {
  const [days, setDays] = useState(7);
  const range = useMemo(() => filterCheckInsByDays(checkIns, days), [checkIns, days]);
  const summary = useMemo(() => buildTrendSummary(checkIns, days), [checkIns, days]);

  return (
    <section className="progress-layout">
      <section className="surface-section">
        <div className="section-heading">
          <h2>Progress</h2>
          <p>Plain-language trends, not diagnosis.</p>
        </div>

        <div className="segmented-control" role="tablist" aria-label="Trend range">
          {[7, 30, 90].map((value) => (
            <button
              className={days === value ? "selected" : ""}
              key={value}
              type="button"
              onClick={() => setDays(value)}
            >
              {value} days
            </button>
          ))}
        </div>

        <div className="metrics-grid">
          <MetricCard label="Check-ins" value={summary.count} icon={<CalendarDays size={18} />} />
          <MetricCard label="Mood avg" value={summary.moodAverage || "-"} icon={<BarChart3 size={18} />} />
          <MetricCard label="Anxiety avg" value={summary.anxietyAverage || "-"} icon={<BarChart3 size={18} />} />
          <MetricCard label="Sleep avg" value={summary.sleepAverage || "-"} icon={<BarChart3 size={18} />} />
        </div>

        <div className="trend-panel">
          <TrendLine label="Mood" color="var(--teal)" points={toPolylinePoints(range, "moodScore")} />
          <TrendLine label="Stress" color="var(--amber)" points={toPolylinePoints(range, "stressScore")} />
          <TrendLine label="Sleep" color="var(--pine)" points={toPolylinePoints(range, "sleepQuality")} />
        </div>

        <div className="insight-panel">
          <Target size={20} />
          <div>
            <strong>Pattern insight</strong>
            <p>{summary.insight}</p>
          </div>
        </div>
      </section>

      <section className="surface-section">
        <div className="section-heading">
          <h2>Goals and completed tools</h2>
          <p>No shame-based streaks.</p>
        </div>
        <div className="goal-list">
          {(carePlan?.goals || []).map((goal) => (
            <article key={goal.id} className="simple-row">
              <Target size={18} />
              <span>
                <strong>{goal.userLanguage || goal.title}</strong>
                <small>{goal.status}</small>
              </span>
            </article>
          ))}
        </div>
        <div className="completed-list">
          {completedModules.slice(0, 8).map((module) => (
            <article key={module.id} className="simple-row">
              <Download size={18} />
              <span>
                <strong>{module.title}</strong>
                <small>{new Date(module.completedAt).toLocaleDateString()}</small>
              </span>
            </article>
          ))}
          {!completedModules.length && <p className="empty">Completed tools will appear here.</p>}
        </div>
      </section>

      <HandoffSummary checkIns={checkIns} completedModules={completedModules} carePlan={carePlan} />
    </section>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <article className="metric-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TrendLine({ label, points, color }) {
  return (
    <article className="trend-line">
      <span>{label}</span>
      <svg viewBox="0 0 260 88" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="44" x2="260" y2="44" />
        {points ? <polyline points={points} style={{ stroke: color }} /> : null}
      </svg>
    </article>
  );
}
