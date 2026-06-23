import test from "node:test";
import assert from "node:assert/strict";
import { parseStartupTaskQuery, startupStatusFromError, startupTaskName } from "../startupTask.mjs";

test("startup task parser handles installed task", () => {
  const output = `"HostName","TaskName","Next Run Time","Status","Logon Mode","Last Run Time","Last Result","Author","Task To Run"
"DARKROOM","\\${startupTaskName}","N/A","Ready","Interactive/Background","N/A","0","brand","powershell.exe -File start-kin-desktop.ps1"`;

  const status = parseStartupTaskQuery(output);

  assert.equal(status.installed, true);
  assert.equal(status.taskName, startupTaskName);
  assert.equal(status.status, "Ready");
  assert.match(status.command, /start-kin-desktop\.ps1/);
});

test("startup task parser handles missing task", () => {
  const status = startupStatusFromError({
    stderr: "ERROR: The system cannot find the file specified.",
  });

  assert.equal(status.installed, false);
  assert.equal(status.taskName, startupTaskName);
  assert.equal(status.status, "missing");
  assert.equal(status.error, "");
});

test("startup task parser keeps command errors visible", () => {
  const status = startupStatusFromError({
    stderr: "ERROR: Access is denied.",
  });

  assert.equal(status.installed, false);
  assert.equal(status.status, "unknown");
  assert.match(status.error, /Access is denied/);
});
