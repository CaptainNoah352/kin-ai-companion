import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { promisify } from "node:util";
import { readStartupTaskStatus, startupTaskName } from "./startupTask.mjs";

const execFileAsync = promisify(execFile);

export const defaultAppPort = 988;

function isIpv4(value) {
  if (typeof value !== "string") return false;
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isPrivateLanIpv4(address) {
  if (!isIpv4(address)) return false;
  const [first, second] = address.split(".").map(Number);
  if (first === 10) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  return false;
}

function isAllInterfaceAddress(address) {
  return ["0.0.0.0", "::", "[::]", "*"].includes(address);
}

function tailscaleCliCandidates() {
  const candidates = [];
  if (process.platform === "win32") {
    candidates.push("C:\\Program Files\\Tailscale\\tailscale.exe");
  }
  candidates.push("tailscale");
  return candidates.filter((candidate, index, list) => list.indexOf(candidate) === index);
}

function parseHostPort(value) {
  if (!value) return null;
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end === -1) return null;
    return {
      host: value.slice(1, end),
      port: value.slice(end + 2),
    };
  }

  const separatorIndex = value.lastIndexOf(":");
  if (separatorIndex === -1) return null;
  return {
    host: value.slice(0, separatorIndex),
    port: value.slice(separatorIndex + 1),
  };
}

function normalizeErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error.code === "ENOENT") return "Tailscale CLI was not found on this computer.";
  return error.message || String(error);
}

export function getLanIpv4(interfaces = networkInterfaces()) {
  const candidates = Object.entries(interfaces)
    .flatMap(([name, addresses]) =>
      (addresses || [])
        .filter((address) => address.family === "IPv4" && !address.internal && isPrivateLanIpv4(address.address))
        .map((address) => ({ name, address: address.address })),
    )
    .sort((left, right) => {
      const score = (candidate) => {
        const name = candidate.name.toLowerCase();
        if (name.includes("wi-fi") || name.includes("wifi") || name.includes("wlan")) return 0;
        if (name.includes("ethernet")) return 1;
        return 2;
      };
      return score(left) - score(right);
    });

  return candidates[0]?.address || "";
}

export function parseTailscaleStatusJson(raw, { appPort = defaultAppPort } = {}) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  const selfIps = [
    ...(Array.isArray(data?.TailscaleIPs) ? data.TailscaleIPs : []),
    ...(Array.isArray(data?.Self?.TailscaleIPs) ? data.Self.TailscaleIPs : []),
  ];
  const ip = selfIps.find(isIpv4) || "";
  const peers = Object.values(data?.Peer || {})
    .map((peer) => ({
      hostName: peer.HostName || peer.DNSName || "unknown",
      dnsName: peer.DNSName || "",
      os: peer.OS || "",
      online: Boolean(peer.Online),
      ip: (Array.isArray(peer.TailscaleIPs) ? peer.TailscaleIPs : []).find(isIpv4) || "",
    }))
    .filter((peer) => peer.hostName || peer.ip);

  return {
    installed: true,
    backendState: data?.BackendState || "Unknown",
    ip,
    url: ip ? `http://${ip}:${appPort}/` : "",
    peers,
    error: "",
  };
}

export function parseNetstatListeningAddresses(stdout, port = defaultAppPort) {
  const addresses = new Set();

  for (const line of String(stdout || "").split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4 || parts[0].toUpperCase() !== "TCP") continue;
    if (!parts.some((part) => part.toUpperCase() === "LISTENING" || part.toUpperCase() === "LISTEN")) continue;

    const parsed = parseHostPort(parts[1]);
    if (parsed?.port === String(port)) {
      addresses.add(parsed.host);
    }
  }

  return [...addresses];
}

export function buildRuntimeStatus({
  api = { ok: false, ai: "offline" },
  appPort = defaultAppPort,
  lanIp = "",
  listeningAddresses = [],
  tailscale = null,
  startup = null,
  desktop = null,
} = {}) {
  const localUrl = `http://127.0.0.1:${appPort}/`;
  const app = {
    port: appPort,
    localUrl,
    lanUrl: lanIp ? `http://${lanIp}:${appPort}/` : "",
    lanIp,
    listeningOnAllInterfaces: listeningAddresses.some(isAllInterfaceAddress),
    listeningAddresses,
  };

  const normalizedTailscale =
    tailscale || {
      installed: false,
      backendState: "unavailable",
      ip: "",
      url: "",
      peers: [],
      error: "Tailscale status has not been checked.",
    };

  return {
    generatedAt: new Date().toISOString(),
    api: {
      ok: Boolean(api?.ok),
      ai: api?.ai || "offline",
      ...(api?.modelRoles ? { modelRoles: api.modelRoles } : {}),
    },
    app,
    tailscale: normalizedTailscale,
    startup:
      startup || {
        installed: false,
        taskName: startupTaskName,
        status: "unknown",
        command: "",
        error: "Startup task status has not been checked.",
      },
    desktop:
      desktop || {
        running: false,
        mode: "web",
        windowUrl: "",
      },
    recoveryActions: buildRecoveryActions({ app, tailscale: normalizedTailscale }),
  };
}

export async function readListeningAddresses({ port = defaultAppPort, timeoutMs = 3000 } = {}) {
  try {
    const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"], {
      timeout: timeoutMs,
      windowsHide: true,
    });
    return parseNetstatListeningAddresses(stdout, port);
  } catch {
    return [];
  }
}

export async function readTailscaleStatus({ appPort = defaultAppPort, timeoutMs = 5000 } = {}) {
  let lastError = null;

  for (const candidate of tailscaleCliCandidates()) {
    if (candidate.includes("\\") && !existsSync(candidate)) continue;

    try {
      const { stdout } = await execFileAsync(candidate, ["status", "--json"], {
        timeout: timeoutMs,
        windowsHide: true,
      });
      return parseTailscaleStatusJson(stdout, { appPort });
    } catch (error) {
      lastError = error;
      if (error?.stdout) {
        try {
          return parseTailscaleStatusJson(error.stdout, { appPort });
        } catch {
          // Fall through to the normalized error below.
        }
      }
      if (error?.code === "ENOENT") continue;
      break;
    }
  }

  const errorMessage = normalizeErrorMessage(lastError);
  return {
    installed: !/not found/i.test(errorMessage),
    backendState: "error",
    ip: "",
    url: "",
    peers: [],
    error: errorMessage || "Tailscale status could not be read.",
  };
}

export async function getRuntimeStatus({
  api = { ok: false, ai: "offline" },
  appPort = defaultAppPort,
  desktop = null,
} = {}) {
  const [listeningAddresses, tailscale, startup] = await Promise.all([
    readListeningAddresses({ port: appPort }),
    readTailscaleStatus({ appPort }),
    readStartupTaskStatus(),
  ]);

  return buildRuntimeStatus({
    api,
    appPort,
    lanIp: getLanIpv4(),
    listeningAddresses,
    tailscale,
    startup,
    desktop,
  });
}

export function buildRecoveryActions({ app, tailscale }) {
  const actions = [];

  if (!app?.listeningOnAllInterfaces) {
    actions.push("Start Kin with npm.cmd start or the Kin desktop app so port 988 listens on 0.0.0.0.");
  }

  if (!tailscale?.installed) {
    actions.push("Install or open Tailscale, then sign this computer into your tailnet.");
    return actions;
  }

  if (tailscale.backendState === "NoState" || !tailscale.ip) {
    actions.push("Run tailscale up --reset --accept-routes=false.");
    actions.push("If Tailscale still has no 100.x IP, open the Tailscale app and re-authenticate.");
    return actions;
  }

  if (tailscale.backendState !== "Running") {
    actions.push(`Tailscale reports ${tailscale.backendState}; open Tailscale and confirm it is connected.`);
    return actions;
  }

  if (app?.listeningOnAllInterfaces && tailscale.ip) {
    actions.push(`Try ${tailscale.url} from another trusted Tailscale device.`);
    actions.push("If that device times out, check Windows Firewall for inbound Node/Vite access on TCP 988.");
  }

  return actions;
}
