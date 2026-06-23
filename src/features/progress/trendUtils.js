export function filterCheckInsByDays(checkIns = [], days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return checkIns.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
}

export function average(items, key) {
  if (!items.length) return 0;
  return Math.round((items.reduce((sum, item) => sum + Number(item[key] || 0), 0) / items.length) * 10) / 10;
}

export function buildTrendSummary(checkIns = [], days = 7) {
  const range = filterCheckInsByDays(checkIns, days);
  const latest = [...range].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const previous = [...range].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[1];

  return {
    count: range.length,
    moodAverage: average(range, "moodScore"),
    anxietyAverage: average(range, "anxietyScore"),
    stressAverage: average(range, "stressScore"),
    sleepAverage: average(range, "sleepQuality"),
    insight: buildPlainInsight(latest, previous, range.length),
  };
}

export function toPolylinePoints(items = [], key, width = 260, height = 88) {
  const ordered = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(-14);
  if (ordered.length <= 1) return "";

  return ordered
    .map((item, index) => {
      const x = (index / (ordered.length - 1)) * width;
      const value = Math.max(1, Math.min(10, Number(item[key] || 1)));
      const y = height - ((value - 1) / 9) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildPlainInsight(latest, previous, count) {
  if (!latest) return "Complete a check-in to start seeing patterns.";
  if (count < 2) return "One check-in is saved. A few more will make trends more useful.";
  if (latest.stressScore > previous.stressScore) return "Stress rose since the last check-in. Consider a short grounding or breathing tool.";
  if (latest.sleepQuality < previous.sleepQuality) return "Sleep quality dipped. A simple wind-down plan may be useful tonight.";
  if (latest.moodScore >= previous.moodScore) return "Mood is holding steady or improving. Notice what supported that shift.";
  return "Small changes are showing up. Keep using the data as a guide, not a judgment.";
}
