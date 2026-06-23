import actValues from "../../content/interventions/act-values.json";
import behavioralActivation from "../../content/interventions/behavioral-activation.json";
import breathingBox from "../../content/interventions/breathing-box.json";
import cbtThoughtRecord from "../../content/interventions/cbt-thought-record.json";
import communicationRehearsal from "../../content/interventions/communication-rehearsal.json";
import grounding54321 from "../../content/interventions/grounding-54321.json";
import ruminationWorryWindow from "../../content/interventions/rumination-worry-window.json";
import selfCompassion from "../../content/interventions/self-compassion.json";
import sleepReset from "../../content/interventions/sleep-reset.json";

export const interventionModules = [
  grounding54321,
  breathingBox,
  cbtThoughtRecord,
  behavioralActivation,
  actValues,
  sleepReset,
  ruminationWorryWindow,
  selfCompassion,
  communicationRehearsal,
];

export function getInterventionById(moduleId) {
  return interventionModules.find((module) => module.id === moduleId);
}

export function getRecommendedInterventions(moduleIds = []) {
  const requested = moduleIds.map(getInterventionById).filter(Boolean);
  if (requested.length) return requested;
  return [grounding54321, breathingBox, behavioralActivation];
}

export function createCompletedModule(module, inputs = {}) {
  return {
    id: makeId("module"),
    moduleId: module.id,
    title: module.title,
    category: module.category,
    inputs,
    completedAt: new Date().toISOString(),
  };
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
