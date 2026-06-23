import { Plus, Save } from "lucide-react";
import { useState } from "react";

const fields = [
  ["warningSigns", "Warning signs"],
  ["internalCopingStrategies", "Internal coping strategies"],
  ["safePlacesOrDistractions", "Safe places or distractions"],
  ["environmentSafetySteps", "Environment safety steps"],
  ["reasonsToStaySafe", "Reasons to stay connected"],
];

export function SafetyPlan({ plan, onSave }) {
  const [draft, setDraft] = useState(
    plan || {
      warningSigns: [],
      internalCopingStrategies: [],
      safePlacesOrDistractions: [],
      trustedContacts: [],
      professionalResources: [],
      environmentSafetySteps: [],
      reasonsToStaySafe: [],
    },
  );

  function updateList(key, value) {
    setDraft((current) => ({ ...current, [key]: value.split("\n").map((item) => item.trim()).filter(Boolean) }));
  }

  function updateContact(index, field, value) {
    setDraft((current) => ({
      ...current,
      trustedContacts: current.trustedContacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    }));
  }

  function addContact() {
    setDraft((current) => ({
      ...current,
      trustedContacts: [
        ...current.trustedContacts,
        { id: crypto.randomUUID(), name: "", relationship: "", phone: "", consentToContact: false },
      ],
    }));
  }

  function save() {
    onSave({
      ...draft,
      id: draft.id || crypto.randomUUID(),
      userId: "local-user",
      updatedAt: new Date().toISOString(),
      createdAt: draft.createdAt || new Date().toISOString(),
      lastReviewedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="surface-section">
      <div className="section-heading">
        <h2>Safety plan</h2>
        <p>Optional, user-controlled, and always separate from emergency care.</p>
      </div>

      <div className="form-grid">
        {fields.map(([key, label]) => (
          <label key={key} className="field-block">
            <span>{label}</span>
            <textarea value={(draft[key] || []).join("\n")} onChange={(event) => updateList(key, event.target.value)} />
          </label>
        ))}
      </div>

      <div className="contacts-panel">
        <div className="inline-heading">
          <h3>Trusted contacts</h3>
          <button className="icon-text-button" type="button" onClick={addContact}>
            <Plus size={16} />
            Add contact
          </button>
        </div>
        {draft.trustedContacts.map((contact, index) => (
          <div className="contact-row" key={contact.id}>
            <input
              value={contact.name}
              onChange={(event) => updateContact(index, "name", event.target.value)}
              placeholder="Name"
              aria-label="Trusted contact name"
            />
            <input
              value={contact.relationship || ""}
              onChange={(event) => updateContact(index, "relationship", event.target.value)}
              placeholder="Relationship"
              aria-label="Trusted contact relationship"
            />
            <input
              value={contact.phone || ""}
              onChange={(event) => updateContact(index, "phone", event.target.value)}
              placeholder="Phone"
              aria-label="Trusted contact phone"
            />
          </div>
        ))}
      </div>

      <button className="primary-button" type="button" onClick={save}>
        <Save size={17} />
        Save safety plan
      </button>
    </section>
  );
}
