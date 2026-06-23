import { Copy, FileText, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { generateHandoffSummary } from "./summaryGenerator.js";

export function HandoffSummary({ checkIns, completedModules, carePlan, safetySignals }) {
  const [days, setDays] = useState(7);
  const summary = useMemo(
    () => generateHandoffSummary({ checkIns, completedModules, carePlan, safetySignals }, days),
    [checkIns, completedModules, carePlan, safetySignals, days],
  );

  function copySummary() {
    const text = [
      "AI-generated user-controlled handoff summary",
      `Date range: ${summary.dateRangeStart} to ${summary.dateRangeEnd}`,
      "",
      "Goals:",
      ...summary.goals.map((goal) => `- ${goal}`),
      "",
      "Symptom trends:",
      ...summary.symptomTrends.map((line) => `- ${line}`),
      "",
      "Completed modules:",
      ...summary.completedModules.map((line) => `- ${line}`),
      "",
      "Current stressors:",
      ...summary.currentStressors.map((line) => `- ${line}`),
      "",
      "Safety concerns:",
      ...summary.safetyConcerns.map((line) => `- ${line}`),
      "",
      summary.userNotes,
    ].join("\n");
    navigator.clipboard?.writeText(text);
  }

  return (
    <section className="surface-section">
      <div className="section-heading">
        <h2>Handoff summary</h2>
        <p>User previews before sharing. Nothing is auto-sent.</p>
      </div>
      <div className="segmented-control">
        {[7, 30].map((value) => (
          <button className={days === value ? "selected" : ""} key={value} type="button" onClick={() => setDays(value)}>
            {value} days
          </button>
        ))}
      </div>
      <div className="summary-preview">
        <FileText size={20} />
        <div>
          <strong>AI-generated summary for review</strong>
          <p>{summary.symptomTrends.join(" ")}</p>
          <small>{summary.completedModules.length} completed tools in range.</small>
        </div>
      </div>
      <div className="button-row">
        <button className="primary-button primary-button--auto" type="button" onClick={copySummary}>
          <Copy size={17} />
          Copy summary
        </button>
        <button className="secondary-button secondary-button--auto" type="button" onClick={() => setDays(days === 7 ? 30 : 7)}>
          <RefreshCw size={17} />
          Regenerate
        </button>
      </div>
    </section>
  );
}
