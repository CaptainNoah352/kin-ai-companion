import { defaultAppPort, getRuntimeStatus } from "../runtimeStatus.mjs";

const apiPort = Number(process.env.PORT || 8787);
const appPort = Number(process.env.KIN_APP_PORT || defaultAppPort);
const appUrl = `http://127.0.0.1:${appPort}/`;
const apiBaseUrls = [...new Set([`http://127.0.0.1:${apiPort}`, `http://127.0.0.1:${appPort}`])];

async function fetchJson(url, options = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? "" : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error.name === "AbortError" ? "Timed out" : error.message,
    };
  }
}

async function fetchText(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return {
      ok: response.ok,
      status: response.status,
      error: response.ok ? "" : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.name === "AbortError" ? "Timed out" : error.message,
    };
  }
}

async function probeApiHealth() {
  let fallback = null;
  for (const baseUrl of apiBaseUrls) {
    const probe = await fetchJson(`${baseUrl}/api/health`);
    if (probe.ok) return { ...probe, baseUrl };
    fallback ||= { ...probe, baseUrl };
  }
  return fallback || { ok: false, status: 0, data: null, error: "No API URL was checked.", baseUrl: apiBaseUrls[0] };
}

async function probeAppLock(baseUrl) {
  return fetchJson(`${baseUrl}/api/app-lock/derive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      passcode: "health-check",
      salt: "a2luLWhlYWx0aC1jaGVjaw==",
      iterations: 1000,
    }),
  });
}

function classifyHealth({ appProbe, healthProbe, appLockProbe, runtimeStatus }) {
  if (!appProbe.ok) return "App down";
  if (!healthProbe.ok || !appLockProbe.ok) return "API down";
  if (runtimeStatus.tailscale.backendState !== "Running" || !runtimeStatus.tailscale.ip) {
    return "Needs Tailscale sign-in";
  }
  return "Ready";
}

function printHealth({ label, appProbe, healthProbe, appLockProbe, runtimeStatus }) {
  console.log(`Kin Health: ${label}`);
  console.log("");
  console.log(`App          ${appProbe.ok ? `OK HTTP ${appProbe.status}` : `FAIL ${appProbe.error}`}`);
  console.log(`API          ${healthProbe.ok ? `OK ${runtimeStatus.api.ai}` : `FAIL ${healthProbe.error}`}`);
  console.log(`App lock API ${appLockProbe.ok ? "OK" : `FAIL ${appLockProbe.error}`}`);
  console.log(`Tailscale    ${runtimeStatus.tailscale.backendState}${runtimeStatus.tailscale.ip ? ` ${runtimeStatus.tailscale.ip}` : ""}`);
  console.log(`Startup      ${runtimeStatus.startup.installed ? "installed" : "not installed"} (${runtimeStatus.startup.taskName})`);
  console.log("");
  console.log(`Local URL    ${runtimeStatus.app.localUrl}`);
  console.log(`LAN URL      ${runtimeStatus.app.lanUrl || "not available"}`);
  console.log(`Remote URL   ${runtimeStatus.tailscale.url || "not available"}`);
  console.log(`Checked      ${runtimeStatus.generatedAt}`);

  if (label !== "Ready") {
    console.log("");
    console.log("Next action");
    for (const action of runtimeStatus.recoveryActions) {
      console.log(`- ${action}`);
    }
  }
}

const [healthProbe, appProbe] = await Promise.all([probeApiHealth(), fetchText(appUrl)]);
const appLockProbe = healthProbe.ok
  ? await probeAppLock(healthProbe.baseUrl)
  : {
      ok: false,
      status: 0,
      data: null,
      error: healthProbe.error,
    };

const api = healthProbe.ok
  ? {
      ok: true,
      ai: healthProbe.data?.ai || "demo",
    }
  : {
      ok: false,
      ai: "offline",
    };

const runtimeStatus = await getRuntimeStatus({ api, appPort });
const label = classifyHealth({ appProbe, healthProbe, appLockProbe, runtimeStatus });

printHealth({ label, appProbe, healthProbe, appLockProbe, runtimeStatus });

process.exitCode = label === "Ready" ? 0 : 1;
