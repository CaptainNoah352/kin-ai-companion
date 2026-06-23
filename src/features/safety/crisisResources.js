export const crisisResources = {
  US: {
    region: "United States",
    crisisLine: "988 Suicide & Crisis Lifeline",
    call: "988",
    text: "988",
    chatUrl: "https://988lifeline.org/",
    emergency: "911",
    note: "Call, text, or chat 988 for 24/7 crisis support in the U.S. Call 911 for immediate danger.",
  },
  SE: {
    region: "Sweden",
    crisisLine: "Local emergency and crisis resources",
    emergency: "112",
    note: "Use verified local Swedish crisis and health services. This prototype only hardcodes emergency 112.",
  },
  default: {
    region: "Local",
    crisisLine: "Local crisis resources",
    emergency: "Local emergency services",
    note: "Use local emergency services for immediate danger. Configure country-specific crisis resources before launch.",
  },
};

export function getCrisisResource(region = "US") {
  return crisisResources[region] || crisisResources.default;
}
