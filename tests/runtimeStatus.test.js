import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRuntimeStatus,
  parseNetstatListeningAddresses,
  parseTailscaleStatusJson,
} from "../runtimeStatus.mjs";

test("parses Tailscale Running state with a 100.x URL", () => {
  const parsed = parseTailscaleStatusJson(
    {
      BackendState: "Running",
      TailscaleIPs: ["100.64.0.10", "fd7a:115c:a1e0::1"],
      Peer: {
        "nodekey:abc": {
          HostName: "trusted-phone",
          DNSName: "trusted-phone.tailnet.ts.net.",
          OS: "iOS",
          Online: true,
          TailscaleIPs: ["100.64.0.20"],
        },
      },
    },
    { appPort: 988 },
  );

  assert.equal(parsed.installed, true);
  assert.equal(parsed.backendState, "Running");
  assert.equal(parsed.ip, "100.64.0.10");
  assert.equal(parsed.url, "http://100.64.0.10:988/");
  assert.equal(parsed.peers.length, 1);
  assert.equal(parsed.peers[0].ip, "100.64.0.20");
});

test("parses Tailscale NoState without a URL", () => {
  const parsed = parseTailscaleStatusJson(
    {
      BackendState: "NoState",
      TailscaleIPs: null,
      Self: {
        TailscaleIPs: null,
      },
    },
    { appPort: 988 },
  );

  assert.equal(parsed.installed, true);
  assert.equal(parsed.backendState, "NoState");
  assert.equal(parsed.ip, "");
  assert.equal(parsed.url, "");
});

test("runtime status never includes API keys or env values", () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "sk-or-v1-runtime-status-should-not-leak";

  const status = buildRuntimeStatus({
    api: { ok: true, ai: "openrouter" },
    appPort: 988,
    lanIp: "192.168.1.216",
    listeningAddresses: ["0.0.0.0"],
    tailscale: {
      installed: true,
      backendState: "NoState",
      ip: "",
      url: "",
      peers: [],
      error: "",
    },
    startup: {
      installed: true,
      taskName: "Kin Local Companion",
      status: "Ready",
      command: "powershell.exe -File start-kin-desktop.ps1",
      error: "",
    },
    desktop: {
      running: true,
      mode: "development",
      windowUrl: "http://127.0.0.1:988/",
    },
  });
  const serialized = JSON.stringify(status);

  assert.equal(serialized.includes("sk-or-v1-runtime-status-should-not-leak"), false);
  assert.equal(serialized.includes("OPENROUTER_API_KEY"), false);
  assert.equal(status.api.ai, "openrouter");
  assert.equal(status.desktop.running, true);
  assert.equal(status.desktop.windowUrl, "http://127.0.0.1:988/");

  if (previousKey === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test("runtime status can expose non-secret model role diagnostics", () => {
  const status = buildRuntimeStatus({
    api: {
      ok: true,
      ai: "openrouter",
      modelRoles: {
        normalCoach: "anthropic/claude-haiku-4.5",
        deepSupport: "anthropic/claude-sonnet-4.5",
      },
    },
  });

  assert.equal(status.api.modelRoles.normalCoach, "anthropic/claude-haiku-4.5");
  assert.equal(status.api.modelRoles.deepSupport, "anthropic/claude-sonnet-4.5");
});

test("detects Vite listening on all interfaces from netstat output", () => {
  const output = `
  TCP    0.0.0.0:988            0.0.0.0:0              LISTENING       1234
  TCP    127.0.0.1:8787         0.0.0.0:0              LISTENING       1235
  TCP    [::]:988               [::]:0                 LISTENING       1234
  `;

  const status = buildRuntimeStatus({
    appPort: 988,
    listeningAddresses: parseNetstatListeningAddresses(output, 988),
  });

  assert.deepEqual(status.app.listeningAddresses, ["0.0.0.0", "::"]);
  assert.equal(status.app.listeningOnAllInterfaces, true);
});
