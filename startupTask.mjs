import { execFile } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const startupTaskName = "Kin Local Companion";

export function getStartupScriptPath(projectRoot = process.cwd()) {
  return resolve(projectRoot, "scripts", "start-kin-desktop.ps1");
}

export function getStartupShortcutPath() {
  if (!process.env.APPDATA) return "";
  return join(
    process.env.APPDATA,
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    `${startupTaskName}.cmd`,
  );
}

export function buildStartupTaskCommand({ projectRoot = process.cwd() } = {}) {
  const powershellPath = process.env.SystemRoot
    ? resolve(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    : "powershell.exe";
  return `"${powershellPath}" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${getStartupScriptPath(projectRoot)}"`;
}

export function buildStartupShortcutContent({ projectRoot = process.cwd() } = {}) {
  return `@echo off\r\n${buildStartupTaskCommand({ projectRoot })}\r\n`;
}

export function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

export function parseSchtasksCsv(stdout) {
  const lines = String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('"'));

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

export function parseStartupTaskQuery(stdout, taskName = startupTaskName) {
  const rows = parseSchtasksCsv(stdout);
  const row = rows.find((candidate) => normalizeTaskName(candidate.TaskName) === taskName) || rows[0];
  if (!row) {
    return missingStartupTaskStatus(taskName);
  }

  return {
    installed: true,
    taskName,
    status: row.Status || "Unknown",
    command: row["Task To Run"] || "",
    error: "",
  };
}

export function startupStatusFromError(error, taskName = startupTaskName) {
  const message = error?.stderr || error?.stdout || error?.message || String(error || "");
  if (/cannot find|does not exist|not found/i.test(message)) {
    return missingStartupTaskStatus(taskName);
  }

  return {
    installed: false,
    taskName,
    status: "unknown",
    command: "",
    error: message.trim() || "Startup task status could not be read.",
  };
}

export async function readStartupTaskStatus({ taskName = startupTaskName, timeoutMs = 5000 } = {}) {
  if (process.platform !== "win32") {
    return {
      installed: false,
      taskName,
      status: "unsupported",
      command: "",
      error: "Startup task status is only available on Windows.",
    };
  }

  try {
    const { stdout } = await execFileAsync("schtasks.exe", ["/Query", "/TN", taskName, "/FO", "CSV", "/V"], {
      timeout: timeoutMs,
      windowsHide: true,
    });
    return parseStartupTaskQuery(stdout, taskName);
  } catch (error) {
    const shortcutStatus = readStartupShortcutStatus({ taskName });
    if (shortcutStatus.installed) return shortcutStatus;
    return startupStatusFromError(error, taskName);
  }
}

export async function installStartupTask({
  projectRoot = process.cwd(),
  taskName = startupTaskName,
  timeoutMs = 10000,
} = {}) {
  if (process.platform !== "win32") {
    throw new Error("Startup task install is only available on Windows.");
  }

  const scriptPath = getStartupScriptPath(projectRoot);
  if (!existsSync(scriptPath)) {
    throw new Error(`Startup script was not found: ${scriptPath}`);
  }

  try {
    const command = buildStartupTaskCommand({ projectRoot });
    await execFileAsync(
      "schtasks.exe",
      ["/Create", "/F", "/SC", "ONLOGON", "/TN", taskName, "/TR", command],
      {
        timeout: timeoutMs,
        windowsHide: true,
      },
    );
  } catch (error) {
    if (!/Access is denied/i.test(error?.stderr || error?.message || "")) {
      throw error;
    }
    installStartupShortcut({ projectRoot, taskName });
  }

  return readStartupTaskStatus({ taskName });
}

export async function uninstallStartupTask({ taskName = startupTaskName, timeoutMs = 10000 } = {}) {
  if (process.platform !== "win32") {
    throw new Error("Startup task uninstall is only available on Windows.");
  }

  try {
    await execFileAsync("schtasks.exe", ["/Delete", "/TN", taskName, "/F"], {
      timeout: timeoutMs,
      windowsHide: true,
    });
  } catch (error) {
    const message = error?.stderr || error?.message || "";
    if (!/cannot find|does not exist|not found|Access is denied/i.test(message)) {
      throw error;
    }
  }

  uninstallStartupShortcut();

  return readStartupTaskStatus({ taskName });
}

export function readStartupShortcutStatus({ taskName = startupTaskName } = {}) {
  const shortcutPath = getStartupShortcutPath();
  if (!shortcutPath || !existsSync(shortcutPath)) {
    return missingStartupTaskStatus(taskName);
  }

  return {
    installed: true,
    taskName,
    status: "Startup folder",
    command: shortcutPath,
    error: "Scheduled task was unavailable; using the current user's Startup folder.",
  };
}

function installStartupShortcut({ projectRoot = process.cwd() } = {}) {
  const shortcutPath = getStartupShortcutPath();
  if (!shortcutPath) {
    throw new Error("APPDATA is not available, so the Startup folder fallback cannot be installed.");
  }
  mkdirSync(resolve(shortcutPath, ".."), { recursive: true });
  writeFileSync(shortcutPath, buildStartupShortcutContent({ projectRoot }), "utf8");
}

function uninstallStartupShortcut() {
  const shortcutPath = getStartupShortcutPath();
  if (shortcutPath && existsSync(shortcutPath)) {
    unlinkSync(shortcutPath);
  }
}

function normalizeTaskName(taskName) {
  return String(taskName || "").replace(/^\\+/, "");
}

function missingStartupTaskStatus(taskName) {
  return {
    installed: false,
    taskName,
    status: "missing",
    command: "",
    error: "",
  };
}
