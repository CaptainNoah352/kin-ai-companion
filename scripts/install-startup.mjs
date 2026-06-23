import { installStartupTask } from "../startupTask.mjs";

const status = await installStartupTask({ projectRoot: process.cwd() });

console.log("Kin startup task installed.");
console.log(`Task: ${status.taskName}`);
console.log(`Status: ${status.status}`);
if (status.error) console.log(`Note: ${status.error}`);
