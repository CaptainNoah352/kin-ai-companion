export const featureFlags = {
  mentalHealthOnboarding: true,
  dailyCheckIn: true,
  aiCoach: true,
  structuredModules: true,
  progressDashboard: true,
  privacyCenter: true,
  handoffSummary: true,
};

export function isFeatureEnabled(flagName) {
  return featureFlags[flagName] !== false;
}
