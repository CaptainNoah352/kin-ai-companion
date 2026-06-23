export const featureFlags = {
  mentalHealthOnboarding: true,
  safetyRouter: true,
  dailyCheckIn: true,
  aiCoach: true,
  structuredModules: true,
  progressDashboard: true,
  privacyCenter: true,
  safetyPlan: true,
  handoffSummary: true,
};

export function isFeatureEnabled(flagName) {
  return featureFlags[flagName] !== false;
}
