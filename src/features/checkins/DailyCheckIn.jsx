import { Check, Clock } from "lucide-react";
import { useState } from "react";
import { createCheckIn, getCheckInRecommendation } from "./checkInService.js";
import { shouldPauseForSafety } from "../safety/safetyRouter.js";

const initialForm = {
  moodScore: 6,
  anxietyScore: 4,
  stressScore: 5,
  energyScore: 5,
  sleepQuality: 6,
  sleepHours: "",
  primaryEmotion: "",
  bodySensation: "",
  stressor: "",
  note: "",
  safeNowNote: "",
};

export function DailyCheckIn({ onComplete, onSafety, latestCheckIn }) {
  const [form, setForm] = useState(initialForm);
  const recommendation = latestCheckIn ? getCheckInRecommendation(latestCheckIn) : null;

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const checkIn = createCheckIn(form);
    onComplete(checkIn);
    if (shouldPauseForSafety({ level: checkIn.safetyFlag })) {
      onSafety(form.note || form.safeNowNote, "check_in");
    }
    setForm(initialForm);
  }

  return (
    <section className="surface-section">
      <div className="section-heading">
        <h2>Daily check-in</h2>
        <p>
          <Clock size={15} /> Designed to take less than 3 minutes.
        </p>
      </div>

      <form className="checkin-form" onSubmit={submit}>
        <div className="slider-grid">
          <Slider label="Mood" value={form.moodScore} onChange={(value) => update("moodScore", value)} />
          <Slider label="Anxiety" value={form.anxietyScore} onChange={(value) => update("anxietyScore", value)} />
          <Slider label="Stress" value={form.stressScore} onChange={(value) => update("stressScore", value)} />
          <Slider label="Energy" value={form.energyScore} onChange={(value) => update("energyScore", value)} />
          <Slider label="Sleep quality" value={form.sleepQuality} onChange={(value) => update("sleepQuality", value)} />
          <label className="field-block field-block--compact">
            <span>Sleep hours</span>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={form.sleepHours}
              onChange={(event) => update("sleepHours", event.target.value)}
            />
          </label>
        </div>

        <div className="form-grid form-grid--two">
          <label className="field-block">
            <span>Main emotion</span>
            <input value={form.primaryEmotion} onChange={(event) => update("primaryEmotion", event.target.value)} />
          </label>
          <label className="field-block">
            <span>Body sensation</span>
            <input value={form.bodySensation} onChange={(event) => update("bodySensation", event.target.value)} />
          </label>
        </div>
        <label className="field-block">
          <span>Today's main stressor</span>
          <input value={form.stressor} onChange={(event) => update("stressor", event.target.value)} />
        </label>
        <label className="field-block">
          <span>One free-text note</span>
          <textarea value={form.note} onChange={(event) => update("note", event.target.value)} />
        </label>
        <button className="primary-button primary-button--auto" type="submit">
          <Check size={17} />
          Save check-in
        </button>
      </form>

      {recommendation && (
        <div className="recommendation-band">
          <strong>Suggested next step</strong>
          <p>{recommendation.reason}</p>
        </div>
      )}
    </section>
  );
}

function Slider({ label, value, onChange }) {
  return (
    <label className="slider-field">
      <span>
        {label}
        <strong>{value}</strong>
      </span>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
