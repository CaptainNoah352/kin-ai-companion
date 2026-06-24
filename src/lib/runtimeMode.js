export function getKinHostingMode() {
  const injectedMode = globalThis.__KIN_HOSTING_MODE__;
  if (typeof injectedMode === "string" && injectedMode.trim()) return injectedMode.trim();
  return import.meta.env?.VITE_KIN_HOSTING || "";
}

export function getKinApiBaseUrl() {
  const injectedBaseUrl = globalThis.__KIN_API_BASE_URL__;
  const baseUrl = typeof injectedBaseUrl === "string" && injectedBaseUrl.trim()
    ? injectedBaseUrl
    : import.meta.env?.VITE_KIN_API_BASE_URL || "";
  return String(baseUrl).trim().replace(/\/+$/, "");
}

export function isGithubPagesRuntime() {
  if (getKinHostingMode() === "github-pages") return true;
  const hostname = globalThis.location?.hostname || "";
  return hostname.endsWith(".github.io");
}

export function shouldUseLocalApi() {
  return !isGithubPagesRuntime();
}

export function shouldUseKinApiBackend() {
  return shouldUseLocalApi() || Boolean(getKinApiBaseUrl());
}

export function buildKinApiUrl(path) {
  const normalizedPath = String(path || "").startsWith("/") ? String(path || "") : `/${path || ""}`;
  const baseUrl = getKinApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
