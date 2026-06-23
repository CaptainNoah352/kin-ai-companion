import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];

function start(name, args) {
  const command = process.platform === "win32" ? "cmd.exe" : npmCommand;
  const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", npmCommand, ...args] : args;
  const child = spawn(command, commandArgs, {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`${name} stopped${signal ? ` by ${signal}` : ` with code ${code}`}.`);
    shutdown(code || 0);
  });

  return child;
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    stopChild(child);
  }
  setTimeout(() => process.exit(code), 200);
}

function stopChild(child) {
  if (child.killed) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      shell: false,
    });
    return;
  }
  child.kill();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("Starting Kin API and web app...");
start("Kin API", ["run", "server"]);
start("Kin web app", ["run", "dev"]);
