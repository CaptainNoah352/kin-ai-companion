import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { app, BrowserWindow, dialog, Menu, shell } from "electron";

const appPort = 988;
const windowUrl = `http://127.0.0.1:${appPort}/`;
const userDataRoot = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
const kinUserData = join(userDataRoot, "Kin Desktop");
const execFileAsync = promisify(execFile);

let mainWindow = null;
let kinServer = null;

app.setName("Kin");
app.setAppUserModelId("local.kin.companion");
app.setPath("userData", kinUserData);

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

if (gotSingleInstanceLock) {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
}

async function probeKin() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${windowUrl}api/health`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForKin({ attempts = 30 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await probeKin()) return true;
    await wait(500);
  }
  return false;
}

function startTailscaleDesktop() {
  if (process.platform !== "win32") return;
  const tailscalePath = getTailscalePath("tailscale-ipn.exe");
  if (!existsSync(tailscalePath)) return;

  const child = spawn(tailscalePath, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

function getTailscalePath(fileName) {
  return join(process.env.ProgramFiles || "C:\\Program Files", "Tailscale", fileName);
}

async function ensureTailscaleServe() {
  if (process.platform !== "win32") return;
  const tailscaleCli = getTailscalePath("tailscale.exe");
  if (!existsSync(tailscaleCli)) return;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await execFileAsync(tailscaleCli, ["serve", "--bg", "--yes", "http://127.0.0.1:988"], {
        timeout: 5000,
        windowsHide: true,
      });
      return;
    } catch {
      await wait(1000);
    }
  }
}

function configureDesktopEnvFile() {
  if (process.env.DOTENV_CONFIG_PATH) return;

  const candidates = [
    join(process.cwd(), ".env"),
    join(process.cwd(), "..", "..", ".env"),
    join(kinUserData, ".env"),
  ];
  const dotenvPath = candidates.find((candidate) => existsSync(candidate));
  if (dotenvPath) {
    process.env.DOTENV_CONFIG_PATH = dotenvPath;
  }
}

async function startKinServerIfNeeded() {
  if (await probeKin()) return;

  configureDesktopEnvFile();
  process.env.KIN_DESKTOP = "1";
  process.env.KIN_DESKTOP_MODE = app.isPackaged ? "packaged" : "development";
  process.env.KIN_DESKTOP_WINDOW_URL = windowUrl;
  process.env.KIN_SERVE_STATIC = "1";
  process.env.KIN_SERVER_HOST = "0.0.0.0";
  process.env.KIN_APP_PORT = String(appPort);
  process.env.PORT = String(appPort);

  const { startKinServer } = await import("../server.mjs");
  kinServer = await startKinServer({ listenPort: appPort, host: "0.0.0.0" });

  if (!(await waitForKin())) {
    throw new Error("Kin started but did not become reachable on port 988.");
  }
}

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 700,
    title: "Kin",
    icon: getAppIconPath(),
    backgroundColor: "#f6f3ee",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isGoogleAuthUrl(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 520,
          height: 720,
          minWidth: 420,
          minHeight: 560,
          title: "Sign in with Google",
          parent: mainWindow,
          backgroundColor: "#ffffff",
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        },
      };
    }

    if (!url.startsWith(windowUrl)) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(windowUrl)) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.loadURL(windowUrl);
}

function isGoogleAuthUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === "accounts.google.com" || hostname.endsWith(".accounts.google.com");
  } catch {
    return false;
  }
}

function getAppIconPath() {
  const bundledIcon = join(app.getAppPath(), "build", "icon.png");
  if (existsSync(bundledIcon)) return bundledIcon;
  return join(process.cwd(), "build", "icon.png");
}

async function boot() {
  try {
    startTailscaleDesktop();
    await startKinServerIfNeeded();
    await ensureTailscaleServe();
    createWindow();
  } catch (error) {
    dialog.showErrorBox("Kin could not start", error?.message || String(error));
    app.quit();
  }
}

if (gotSingleInstanceLock) {
  app.whenReady().then(boot);

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", () => {
    if (kinServer) {
      kinServer.close();
      kinServer = null;
    }
  });
}
