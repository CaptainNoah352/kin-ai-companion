import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const releaseDir = join(root, "release");
const primaryOutputDir = join(releaseDir, "win-unpacked");
let outputDir = primaryOutputDir;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function getTempOutputDir() {
  return `${outputDir}.tmp`;
}

function getAppDir() {
  return join(outputDir, "resources", "app");
}

async function run(command, args, { cwd = root, allowFailure = false } = {}) {
  const code = await new Promise((resolveRun) => {
    const child = spawn(...buildSpawnArgs(command, args), {
      cwd,
      stdio: "inherit",
      shell: false,
    });
    child.on("exit", (exitCode) => resolveRun(exitCode ?? 1));
  });

  if (code !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${code}.`);
  }
  return code;
}

function buildSpawnArgs(command, args) {
  if (process.platform !== "win32") {
    return [command, args];
  }

  return ["cmd.exe", ["/d", "/s", "/c", [quoteCmdArg(command), ...args.map(quoteCmdArg)].join(" ")]];
}

function quoteCmdArg(value) {
  const text = String(value);
  if (!/[ \t&()^;!'+,`~]/.test(text)) return text;
  return `"${text.replace(/"/g, '\\"')}"`;
}

async function pathExists(path) {
  return existsSync(path);
}

async function cleanDesktopOutput() {
  await rm(outputDir, { recursive: true, force: true });
  await rm(getTempOutputDir(), { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });
}

async function cleanDesktopOutputOrUseFreshFallback() {
  try {
    await cleanDesktopOutput();
    return;
  } catch (error) {
    const fallbackName = `win-unpacked-${new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
    outputDir = join(releaseDir, fallbackName);
    console.warn(
      `Could not clean ${primaryOutputDir}: ${error.message}. Building a fresh unpacked app at ${outputDir}.`,
    );
    await rm(outputDir, { recursive: true, force: true });
    await rm(getTempOutputDir(), { recursive: true, force: true });
    await mkdir(releaseDir, { recursive: true });
  }
}

async function tryElectronBuilder() {
  try {
    await cleanDesktopOutput();
  } catch (error) {
    console.warn(`electron-builder skipped because ${primaryOutputDir} could not be cleaned: ${error.message}`);
    return false;
  }
  const code = await run(npmCommand, ["exec", "electron-builder", "--", "--win", "dir"], { allowFailure: true });
  if (code === 0) return true;
  return false;
}

async function createFallbackUnpackedBuild() {
  await cleanDesktopOutputOrUseFreshFallback();
  const appDir = getAppDir();

  const electronDist = join(root, "node_modules", "electron", "dist");
  if (!(await pathExists(electronDist))) {
    throw new Error(`Electron runtime was not found at ${electronDist}.`);
  }

  await cp(electronDist, outputDir, { recursive: true });
  await rename(join(outputDir, "electron.exe"), join(outputDir, "Kin.exe"));
  await rm(join(outputDir, "resources", "default_app.asar"), { force: true });

  await mkdir(appDir, { recursive: true });
  await Promise.all([
    cp(join(root, "build"), join(appDir, "build"), { recursive: true }),
    cp(join(root, "electron"), join(appDir, "electron"), { recursive: true }),
    cp(join(root, "dist"), join(appDir, "dist"), { recursive: true }),
    cp(join(root, "src"), join(appDir, "src"), { recursive: true }),
    cp(join(root, "server.mjs"), join(appDir, "server.mjs")),
    cp(join(root, "runtimeStatus.mjs"), join(appDir, "runtimeStatus.mjs")),
    cp(join(root, "startupTask.mjs"), join(appDir, "startupTask.mjs")),
  ]);

  const rootPackage = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const runtimeDependencies = Object.fromEntries(
    ["cors", "dotenv", "express"]
      .filter((name) => rootPackage.dependencies?.[name])
      .map((name) => [name, rootPackage.dependencies[name]]),
  );

  await writeFile(
    join(appDir, "package.json"),
    `${JSON.stringify(
      {
        name: rootPackage.name,
        version: rootPackage.version,
        private: true,
        type: "module",
        main: "electron/main.mjs",
        dependencies: runtimeDependencies,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await run(npmCommand, ["install", "--omit=dev", "--ignore-scripts", "--no-audit", "--fund=false"], {
    cwd: appDir,
  });
}

await run(npmCommand, ["run", "build"]);

if (await tryElectronBuilder()) {
  console.log(`Kin desktop build created at ${outputDir}`);
} else {
  console.log("electron-builder could not finish on this Windows folder; creating fallback unpacked build.");
  await createFallbackUnpackedBuild();
  console.log(`Kin desktop fallback build created at ${outputDir}`);
}
