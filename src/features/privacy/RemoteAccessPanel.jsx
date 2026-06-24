import { AlertTriangle, Clock, Copy, ExternalLink, RefreshCw, Router, Server, ShieldCheck, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { isGithubPagesRuntime } from "../../lib/runtimeMode.js";

export function RemoteAccessPanel() {
  if (isGithubPagesRuntime()) return <HostedAccessPanel />;
  return <LocalRemoteAccessPanel />;
}

function LocalRemoteAccessPanel() {
  const [status, setStatus] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [copiedLabel, setCopiedLabel] = useState("");
  const [error, setError] = useState("");

  async function loadStatus() {
    setLoadState("loading");
    setError("");
    try {
      const response = await fetch("/api/runtime/status");
      if (!response.ok) throw new Error(`Runtime status returned HTTP ${response.status}.`);
      setStatus(await response.json());
      setLoadState("ready");
    } catch (loadError) {
      setError(loadError.message || "Runtime status could not be read.");
      setLoadState("error");
    }
  }

  async function copyUrl(label, url) {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(""), 1800);
    } catch {
      setCopiedLabel("Copy failed");
      window.setTimeout(() => setCopiedLabel(""), 1800);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const apiLabel = status?.api?.ok ? aiLabel(status.api.ai) : "Offline";
  const tailscaleState = status?.tailscale?.backendState || "Checking";
  const tailscaleHasUrl = Boolean(status?.tailscale?.url);
  const startupLabel = status?.startup ? startupStatusLabel(status.startup) : "Checking";
  const lastChecked = status?.generatedAt ? new Date(status.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  const needsTailscaleRecovery = status && (!tailscaleHasUrl || tailscaleState !== "Running");

  return (
    <section className="surface-section remote-access-panel">
      <div className="section-heading">
        <div>
          <h2>Remote access</h2>
          <p>{lastChecked ? `Trusted-device URLs and local runtime status. Last checked ${lastChecked}.` : "Trusted-device URLs and local runtime status for Kin."}</p>
        </div>
        <button className="icon-text-button" type="button" onClick={loadStatus} disabled={loadState === "loading"}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="notice-strip notice-strip--warning">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="remote-status-grid" aria-live="polite">
        <StatusPill icon={ShieldCheck} label="API" value={loadState === "loading" ? "Checking" : apiLabel} />
        <StatusPill icon={Server} label="App port" value={status?.app?.listeningOnAllInterfaces ? "0.0.0.0:988" : "Not LAN-ready"} />
        <StatusPill icon={Router} label="Tailscale" value={tailscaleState} />
        <StatusPill icon={Clock} label="Start at login" value={startupLabel} />
      </div>

      <div className="remote-url-grid">
        <RemoteUrlCard
          icon={Server}
          label="Local URL"
          description="This computer"
          url={status?.app?.localUrl}
          copiedLabel={copiedLabel}
          onCopy={copyUrl}
        />
        <RemoteUrlCard
          icon={Wifi}
          label="LAN URL"
          description={status?.app?.lanIp ? "Same Wi-Fi or wired network" : "No active LAN IPv4 detected"}
          url={status?.app?.lanUrl}
          copiedLabel={copiedLabel}
          onCopy={copyUrl}
        />
        <RemoteUrlCard
          icon={Router}
          label="Tailscale URL"
          description={tailscaleHasUrl ? `${status.tailscale.ip} on your tailnet` : "Waiting for a Tailscale 100.x IP"}
          url={status?.tailscale?.url}
          copiedLabel={copiedLabel}
          onCopy={copyUrl}
        />
      </div>

      {needsTailscaleRecovery && (
        <div className="remote-recovery-panel">
          <div>
            <strong>Tailscale recovery</strong>
            <p>{tailscaleRecoveryCopy(status.tailscale)}</p>
          </div>
          <code>tailscale up --reset --accept-routes=false</code>
          <p>If Tailscale gets a 100.x IP but another trusted device still times out, check Windows Firewall for inbound TCP 988.</p>
        </div>
      )}
    </section>
  );
}

function HostedAccessPanel() {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return (
    <section className="surface-section remote-access-panel">
      <div className="section-heading">
        <div>
          <h2>Hosted access</h2>
          <p>GitHub Pages mode. Each person signs in with their own Google account and encrypted Drive vault.</p>
        </div>
        <ShieldCheck size={22} />
      </div>

      <div className="remote-status-grid" aria-live="polite">
        <StatusPill icon={ShieldCheck} label="Hosting" value="GitHub Pages" />
        <StatusPill icon={Server} label="Local API" value="Not required" />
        <StatusPill icon={Router} label="Accounts" value="Google-owned" />
        <StatusPill icon={Wifi} label="Sync" value="Drive vault" />
      </div>

      <div className="remote-recovery-panel">
        <div>
          <strong>Friend setup</strong>
          <p>Share the public Kin URL. Friends use their own Google login, their own vault passcode, and their own optional OpenRouter key.</p>
        </div>
        <code>{origin || "GitHub Pages"}</code>
      </div>
    </section>
  );
}

function startupStatusLabel(startup) {
  if (startup.installed) return "Installed";
  if (startup.status === "missing") return "Not installed";
  return "Unknown";
}

function StatusPill({ icon: Icon, label, value }) {
  return (
    <div className="remote-status-pill">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RemoteUrlCard({ icon: Icon, label, description, url, copiedLabel, onCopy }) {
  return (
    <article className="remote-url-card">
      <div className="remote-url-card__heading">
        <Icon size={19} />
        <span>
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
      </div>
      <code>{url || "Not available"}</code>
      <div className="button-row">
        <button className="secondary-button secondary-button--auto" type="button" disabled={!url} onClick={() => onCopy(label, url)}>
          <Copy size={16} />
          {copiedLabel === label ? "Copied" : "Copy"}
        </button>
        {url ? (
          <a className="ghost-button" href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Open
          </a>
        ) : (
          <button className="ghost-button" type="button" disabled>
            <ExternalLink size={16} />
            Open
          </button>
        )}
      </div>
    </article>
  );
}

function aiLabel(mode) {
  const labels = {
    openrouter: "OpenRouter",
    openai: "OpenAI",
    demo: "Demo",
    offline: "Offline",
  };
  return labels[mode] || "Demo";
}

function tailscaleRecoveryCopy(tailscale) {
  if (!tailscale?.installed) {
    return "Tailscale is not available to the Kin runtime. Open or install Tailscale, then sign this computer in.";
  }
  if (tailscale.backendState === "NoState" || !tailscale.ip) {
    return "Tailscale is not currently giving this computer a reachable 100.x address.";
  }
  return `Tailscale reports ${tailscale.backendState}. Open the Tailscale app and confirm this computer is connected.`;
}
