import { uninstallStartupTask } from "../startupTask.mjs";

const status = await uninstallStartupTask();

console.log("Kin startup task removed.");
console.log(`Task: ${status.taskName}`);
console.log(`Status: ${status.status}`);
