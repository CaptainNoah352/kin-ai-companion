export function MetricRing({ value, label, tone = "teal" }) {
  const safeValue = Math.max(0, Math.min(10, Number(value || 0)));
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (safeValue / 10) * circumference;

  return (
    <div className={`metric-ring metric-ring--${tone}`} aria-label={`${label}: ${safeValue} out of 10`}>
      <svg viewBox="0 0 92 92" aria-hidden="true">
        <circle cx="46" cy="46" r="38" className="metric-ring__track" />
        <circle
          cx="46"
          cy="46"
          r="38"
          className="metric-ring__value"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div>
        <strong>{safeValue || "-"}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
