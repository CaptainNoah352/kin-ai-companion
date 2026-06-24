import { LifeBuoy, Phone, Shield } from "lucide-react";
import { getCrisisResource } from "./crisisResources.js";

export function SupportResources({ region = "US" }) {
  const resource = getCrisisResource(region);

  return (
    <section className="safety-flow" aria-live="polite">
      <div className="safety-flow__header">
        <div className="safety-flow__icon">
          <LifeBuoy size={22} />
        </div>
        <div>
          <h2>Support resources</h2>
          <p>Reference information for human support and emergency options. Kin does not provide crisis services.</p>
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
        {resource.chatUrl && (
          <a className="safety-action" href={resource.chatUrl} target="_blank" rel="noreferrer">
            <Shield size={21} />
            <span>
              <strong>{resource.crisisLine}</strong>
              Crisis and emergency resources
            </span>
          </a>
        )}
      </div>

      <p className="safety-note">{resource.note}</p>
    </section>
  );
}
