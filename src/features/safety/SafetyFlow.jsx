import { AlertTriangle, Phone, Shield, UserRoundPlus } from "lucide-react";
import { getCrisisResource } from "./crisisResources.js";

export function SafetyFlow({ signal, region = "US", onClose, onOpenPlan }) {
  const resource = getCrisisResource(region);
  const imminent = signal?.level === "imminent" || signal?.category === "suicide_plan_or_means";

  return (
    <section className="safety-flow" aria-live="assertive">
      <div className="safety-flow__header">
        <div className="safety-flow__icon">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h2>{imminent ? "Use immediate human support" : "Pause for safety support"}</h2>
          <p>
            Normal AI coaching is paused. This app is not a crisis service and should not be your only support path.
          </p>
        </div>
      </div>

      <div className="safety-actions">
        <a className="safety-action safety-action--primary" href={`tel:${resource.call || resource.emergency}`}>
          <Phone size={21} />
          <span>
            <strong>{resource.call || resource.emergency}</strong>
            {resource.call ? `Call or text ${resource.call}` : "Call emergency services"}
          </span>
        </a>
        <a className="safety-action" href={resource.chatUrl || "#support"} target="_blank" rel="noreferrer">
          <Shield size={21} />
          <span>
            <strong>{resource.crisisLine}</strong>
            Crisis and emergency resources
          </span>
        </a>
        <button className="safety-action" type="button" onClick={onOpenPlan}>
          <UserRoundPlus size={21} />
          <span>
            <strong>Trusted support</strong>
            Open safety plan and contacts
          </span>
        </button>
      </div>

      <p className="safety-note">{resource.note}</p>

      <div className="button-row">
        <button className="secondary-button" type="button" onClick={onOpenPlan}>
          Open safety plan
        </button>
        {onClose && (
          <button className="ghost-button" type="button" onClick={onClose}>
            Return to app
          </button>
        )}
      </div>
    </section>
  );
}
