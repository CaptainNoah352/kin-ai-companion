import { defaultAppPort, getRuntimeStatus, safetyRouterVersion } from "../runtimeStatus.mjs";

const apiPort = Number(process.env.PORT || 8787);
const appPort = Number(process.env.KIN_APP_PORT || defaultAppPort);
const localAppUrl = `http://127.0.0.1:${appPort}/`;
const apiBaseUrls = [...new Set([`http://127.0.0.1:${apiPort}`, `http://127.0.0.1:${appPort}`])];

async function readJson(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      return { ok: false, status: response.status, error: `HTTP ${response.status}` };
    }
    return { ok: true, status: response.status, data: await response.json() };
  } catch (error) {
    return { ok: false, status: 0, error: error.name === "AbortError" ? "Timed out" : error.message };
  }
}

async function probeHttp(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return { ok: response.ok, status: response.status, error: response.ok ? "" : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, status: 0, error: error.name === "AbortError" ? "Timed out" : error.message };
  }
}

function statusWord(ok) {
  return ok ? "OK" : "FAIL";
}

function printUrl(label, url) {
  console.log(`${label.padEnd(14)} ${url || "not available"}`);
}

function printRuntimeStatus(status, appProbe, healthProbe) {
  console.log("Kin Remote Access Check");
  console.log("");
  console.log(`API health     ${statusWord(healthProbe.ok)} ${healthProbe.ok ? status.api.ai : healthProbe.error}`);
  console.log(`Safety router  ${status.api.safetyRouter || safetyRouterVersion}`);
  console.log(`App HTTP       ${statusWord(appProbe.ok)} ${appProbe.ok ? `HTTP ${appProbe.status}` : appProbe.error}`);
  console.log(`App binding    ${status.app.listeningOnAllInterfaces ? "0.0.0.0/[::] on port 988" : "not listening on all interfaces"}`);
  console.log(`Listen addrs   ${status.app.listeningAddresses.length ? status.app.listeningAddresses.join(", ") : "none detected"}`);
  console.log("");
  printUrl("Local URL", status.app.localUrl);
  printUrl("LAN URL", status.app.lanUrl);
  printUrl("Tailscale URL", status.tailscale.url);
  console.log("");
  console.log(`Tailscale      ${status.tailscale.installed ? status.tailscale.backendState : "not installed"}`);
  if (status.tailscale.ip) console.log(`Tailscale IP   ${status.tailscale.ip}`);
  if (status.tailscale.error) console.log(`Tailscale err  ${status.tailscale.error}`);
  if (status.tailscale.peers?.length) console.log(`Peers          ${status.tailscale.peers.length} visible`);
  console.log(`Start login    ${status.startup.installed ? "installed" : "not installed"} (${status.startup.taskName})`);
  if (status.desktop?.running) {
    console.log(`Desktop        ${status.desktop.mode || "running"} ${status.desktop.windowUrl || ""}`.trim());
  }
  console.log("");
  console.log("Next action");
  for (const action of status.recoveryActions) {
    console.log(`- ${action}`);
  }
}

async function probeApiHealth() {
  let fallback = null;
  for (const baseUrl of apiBaseUrls) {
    const probe = await readJson(`${baseUrl}/api/health`);
    if (probe.ok) return { ...probe, baseUrl };
    fallback ||= { ...probe, baseUrl };
  }
  return fallback || { ok: false, status: 0, error: "No API URL was checked.", baseUrl: apiBaseUrls[0] };
}

const healthProbe = await probeApiHealth();
const api = healthProbe.ok
  ? {
      ok: true,
      ai: healthProbe.data.ai || "demo",
      safetyRouter: healthProbe.data.safetyRouter || safetyRouterVersion,
    }
  : {
      ok: false,
      ai: "offline",
      safetyRouter: safetyRouterVersion,
    };

const [status, appProbe] = await Promise.all([
  getRuntimeStatus({ api, appPort }),
  probeHttp(localAppUrl),
]);

printRuntimeStatus(status, appProbe, healthProbe);

process.exitCode = healthProbe.ok && appProbe.ok && status.app.listeningOnAllInterfaces ? 0 : 1;
