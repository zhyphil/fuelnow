import { describe, expect, it } from "vitest";
import {
  assessPhase5Checklist,
  PHASE5_ACCEPTANCE_GATES,
  PHASE5_TASK_IDS,
} from "../src/quality/releaseChecklist.js";

const complete = [
  "# Phase 5 — 测试",
  ...PHASE5_TASK_IDS.map((id) => `- [x] \`${id}\` task`),
  "## Phase 5 验收门槛",
  ...PHASE5_ACCEPTANCE_GATES.map((gate) => `- [x] ${gate}`),
  "# Phase 6 — Beta",
].join("\n");
describe("release checklist fail-closed audit", () => {
  it("never authorizes a release even if all checkboxes are checked", () => {
    expect(assessPhase5Checklist(complete)).toMatchObject({
      checklistComplete: true,
      releaseAuthorized: false,
      completedTasks: 21,
      pendingGates: [],
      decision: "MANUAL_RELEASE_APPROVAL_REQUIRED",
    });
  });
  it("reports unfinished tasks and gates", () => {
    const report = assessPhase5Checklist(
      complete
        .replace("[x] `P5-REL-01`", "[ ] `P5-REL-01`")
        .replace(
          `[x] ${PHASE5_ACCEPTANCE_GATES[0]}`,
          `[ ] ${PHASE5_ACCEPTANCE_GATES[0]}`,
        ),
    );
    expect(report).toMatchObject({
      checklistComplete: false,
      completedTasks: 20,
      pendingTasks: ["P5-REL-01"],
      pendingGates: [1],
    });
  });
  it("does not count completed engineering subtasks as parent completion", () => {
    const value = complete.replace(
      "- [x] `P5-REL-01` task",
      "- [ ] `P5-REL-01` task\n  - [x] `P5-REL-01a` done",
    );
    expect(assessPhase5Checklist(value).pendingTasks).toEqual(["P5-REL-01"]);
  });
  it.each([
    complete.replace("- [x] `P5-QA-01` task\n", ""),
    complete.replace(
      "## Phase 5 验收门槛",
      "- [x] `P5-QA-01` duplicate\n## Phase 5 验收门槛",
    ),
    complete.replace(
      "## Phase 5 验收门槛",
      "- [x] `P5-QA-99` unexpected\n## Phase 5 验收门槛",
    ),
    complete.replace("# Phase 6 — Beta", ""),
    complete.replace("## Phase 5 验收门槛", "## Other"),
    complete.replace(
      `- [x] ${PHASE5_ACCEPTANCE_GATES[1]}`,
      `- [x] ${PHASE5_ACCEPTANCE_GATES[0]}`,
    ),
  ])("rejects missing, duplicate or malformed entries", (value) => {
    const report = assessPhase5Checklist(value);
    expect(report.checklistComplete).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
  });
  it("ignores unrelated phases and accepts evidence suffixes", () => {
    expect(
      assessPhase5Checklist(
        `${complete.replace(PHASE5_ACCEPTANCE_GATES[0]!, `${PHASE5_ACCEPTANCE_GATES[0]} — evidence recorded`)}\n- [ ] \`P5-QA-01\` unrelated`,
      ).checklistComplete,
    ).toBe(true);
  });
});
