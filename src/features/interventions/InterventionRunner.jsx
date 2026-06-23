import { Check, ChevronRight, Clock, Save, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { createCompletedModule, getInterventionById, interventionModules } from "./interventionService.js";

export function InterventionRunner({ selectedModuleId, onSelectModule, drafts, setDrafts, onComplete }) {
  const selected = useMemo(
    () => getInterventionById(selectedModuleId) || interventionModules[0],
    [selectedModuleId],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const draft = drafts[selected.id] || {};
  const step = selected.steps[stepIndex];

  function updateInput(key, value) {
    setDrafts((current) => ({
      ...current,
      [selected.id]: {
        ...(current[selected.id] || {}),
        [key]: value,
      },
    }));
  }

  function complete() {
    onComplete(createCompletedModule(selected, draft));
    setStepIndex(0);
  }

  return (
    <section className="tools-layout">
      <aside className="tool-list" aria-label="Intervention tools">
        <div className="section-heading">
          <h2>Tools</h2>
          <p>Evidence-informed exercises</p>
        </div>
        {interventionModules.map((module) => (
          <button
            className={module.id === selected.id ? "tool-row selected" : "tool-row"}
            type="button"
            key={module.id}
            onClick={() => {
              onSelectModule(module.id);
              setStepIndex(0);
            }}
          >
            <Wrench size={18} />
            <span>
              <strong>{module.title}</strong>
              <small>{module.estimatedMinutes} min - {module.category.replaceAll("_", " ")}</small>
            </span>
            <ChevronRight size={16} />
          </button>
        ))}
      </aside>

      <section className="surface-section tool-runner">
        <div className="tool-runner__header">
          <div>
            <h2>{selected.title}</h2>
            <p>
              <Clock size={15} /> {selected.estimatedMinutes} minutes - {selected.evidenceLevel}
            </p>
          </div>
          <span>{stepIndex + 1} / {selected.steps.length}</span>
        </div>

        <div className="tool-step">
          <h3>{step.title}</h3>
          <p>{step.body}</p>
          <StepInput step={step} value={draft[step.inputKey] || ""} onChange={updateInput} />
        </div>

        <div className="button-row">
          <button
            className="ghost-button"
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
          >
            Back
          </button>
          {stepIndex < selected.steps.length - 1 ? (
            <button className="primary-button primary-button--auto" type="button" onClick={() => setStepIndex((value) => value + 1)}>
              Next
              <ChevronRight size={17} />
            </button>
          ) : (
            <button className="primary-button primary-button--auto" type="button" onClick={complete}>
              <Check size={17} />
              Complete
            </button>
          )}
          <button className="secondary-button secondary-button--auto" type="button">
            <Save size={17} />
            Autosaved
          </button>
        </div>

        <div className="completion-note">
          <strong>Completion prompt</strong>
          <p>{selected.completionPrompt}</p>
        </div>
      </section>
    </section>
  );
}

function StepInput({ step, value, onChange }) {
  if (!step.inputKey) return null;
  if (step.type === "choice") {
    return (
      <div className="choice-grid">
        {step.options.map((option) => (
          <button
            className={value === option ? "choice-chip selected" : "choice-chip"}
            key={option}
            type="button"
            onClick={() => onChange(step.inputKey, option)}
          >
            <Check size={16} />
            {option}
          </button>
        ))}
      </div>
    );
  }
  if (step.type === "rating") {
    return (
      <label className="slider-field slider-field--wide">
        <span>
          Rating
          <strong>{value || 5}</strong>
        </span>
        <input type="range" min="1" max="10" value={value || 5} onChange={(event) => onChange(step.inputKey, Number(event.target.value))} />
      </label>
    );
  }
  if (step.type === "breathing_timer") {
    return (
      <div className="breathing-card">
        <div className="breath-orb" aria-hidden="true">4-6</div>
        <button className="secondary-button secondary-button--auto" type="button" onClick={() => onChange(step.inputKey, "completed")}>
          Mark practice complete
        </button>
      </div>
    );
  }
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(step.inputKey, event.target.value)}
      placeholder="Write a few words..."
      aria-label={step.title}
    />
  );
}
