import { buildKinApiUrl, getKinApiBaseUrl, isGithubPagesRuntime, shouldUseKinApiBackend } from "./runtimeMode.js";

export const renderWakeTimeoutMs = 75000;
const healthAttemptTimeoutMs = 12000;
const retryDelayMs = 3000;

export class KinApiError extends Error {
  constructor(message, diagnostics = {}) {
    super(message);
    this.name = "KinApiError";
    Object.assign(this, diagnostics);
  }
}

export function getKinApiDiagnostics(path = "") {
  const apiUrl = buildKinApiUrl(path || "/api/health");
  return {
    endpoint: path || "/api/health",
    apiUrl,
    apiBaseUrl: getKinApiBaseUrl() || "same-origin",
    browserOrigin: globalThis.location?.origin || "unknown",
    apiMode: isGithubPagesRuntime() ? "github-pages" : "local",
  };
}

export async function fetchKinApiHealth({ timeoutMs = healthAttemptTimeoutMs } = {}) {
  const response = await fetchWithTimeout(buildKinApiUrl("/api/health"), {}, timeoutMs);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw createResponseError(response, data, "/api/health");
  return data;
}

export async function waitForKinApi({ onStatus, timeoutMs = renderWakeTimeoutMs } = {}) {
  if (!shouldUseKinApiBackend()) return null;

  const startedAt = Date.now();
  let attempt = 0;
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    attempt += 1;
    onStatus?.(attempt === 1 ? "Waking AI server..." : "Still waking AI server...");
    try {
      const data = await fetchKinApiHealth();
      onStatus?.("AI server connected.");
      return data;
    } catch (error) {
      lastError = error;
      await sleep(retryDelayMs);
    }
  }

  throw new KinApiError("Kin could not reach the AI server after waiting for it to wake up.", {
    ...getKinApiDiagnostics("/api/health"),
    causeMessage: lastError?.message || "",
    status: lastError?.status || 0,
  });
}

export async function postKinApiJson(path, body, { onStatus } = {}) {
  await waitForKinApi({ onStatus });

  const response = await fetch(buildKinApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw createResponseError(response, data, path);
  return data;
}

export function formatKinApiError(error, fallback = "Kin could not reach the AI server.") {
  const details = [
    error?.message || fallback,
    error?.status ? `HTTP ${error.status}` : "",
    error?.endpoint ? `Endpoint: ${error.endpoint}` : "",
    error?.apiUrl ? `API URL: ${error.apiUrl}` : "",
    error?.modelRole ? `Role: ${error.modelRole}` : "",
    error?.model ? `Model: ${error.model}` : "",
    error?.providerStatus ? `Provider HTTP ${error.providerStatus}` : "",
  ].filter(Boolean);
  return details.join(" ");
}

function createResponseError(response, data, path) {
  return new KinApiError(data?.error || `Kin API request failed with HTTP ${response.status}.`, {
    ...getKinApiDiagnostics(path),
    status: response.status,
    provider: data?.provider || "",
    modelRole: data?.modelRole || "",
    model: data?.model || "",
    providerStatus: data?.providerStatus || 0,
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = healthAttemptTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    throw new KinApiError("Kin API did not respond before the request timed out.", {
      ...getKinApiDiagnostics("/api/health"),
      causeMessage: error?.message || "",
    });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
