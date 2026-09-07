import { readFile } from "node:fs/promises";
import { assessPhase5Checklist } from "./releaseChecklist.js";

try {
  const markdown = await readFile(
    new URL("../../../../PROJECT_TASKS.md", import.meta.url),
    "utf8",
  );
  const report = assessPhase5Checklist(markdown);
  process.stdout.write(
    `${JSON.stringify({ checkedAt: new Date().toISOString(), ...report }, null, 2)}\n`,
  );
  process.exitCode = report.checklistComplete ? 0 : 2;
} catch {
  process.stderr.write("Release checklist could not be verified\n");
  process.exitCode = 1;
}
