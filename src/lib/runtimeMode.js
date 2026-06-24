export function getKinHostingMode() {
  const injectedMode = globalThis.__KIN_HOSTING_MODE__;
  if (typeof injectedMode === "string" && injectedMode.trim()) return injectedMode.trim();
  return import.meta.env?.VITE_KIN_HOSTING || "";
}

export function isGithubPagesRuntime() {
  if (getKinHostingMode() === "github-pages") return true;
  const hostname = globalThis.location?.hostname || "";
  return hostname.endsWith(".github.io");
}

export function shouldUseLocalApi() {
  return !isGithubPagesRuntime();
}
