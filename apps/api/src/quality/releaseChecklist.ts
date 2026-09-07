export const PHASE5_TASK_IDS = [
  ...Array.from({ length: 10 }, (_, i) => `P5-QA-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 6 }, (_, i) => `P5-LEG-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 5 }, (_, i) => `P5-REL-${String(i + 1).padStart(2, "0")}`),
];
export const PHASE5_ACCEPTANCE_GATES = [
  "法国和西班牙代表性地区均已通过测试",
  "数据来源、位置隐私和第三方服务要求均已检查",
  "关键错误与同步失败均有监控",
  "V1 可以安全地交给小规模真实用户测试",
];

/** A checklist audit is not legal sign-off, live evidence, or release authorization. */
export function assessPhase5Checklist(markdown: string) {
  const issues: string[] = [];
  const starts = [...markdown.matchAll(/^# Phase 5 — .+$/gm)];
  const ends = [...markdown.matchAll(/^# Phase 6 — .+$/gm)];
  if (starts.length !== 1 || ends.length !== 1 || starts[0]!.index >= ends[0]!.index)
    issues.push("invalid_phase_boundaries");
  const section = issues.length ? "" : markdown.slice(starts[0]!.index, ends[0]!.index);
  const tasks = [...section.matchAll(/^- \[([ x])\] `(P5-(?:QA|LEG|REL)-\d{2})`/gm)];
  if (tasks.some((match) => !PHASE5_TASK_IDS.includes(match[2]!)))
    issues.push("unexpected_task_id");
  const pendingTasks = PHASE5_TASK_IDS.filter((id) => {
    const matches = tasks.filter((match) => match[2] === id);
    if (matches.length !== 1) issues.push(`missing_or_duplicate:${id}`);
    return matches.length !== 1 || matches[0]![1] !== "x";
  });
  const gateHeaders = [...section.matchAll(/^## Phase 5 验收门槛$/gm)];
  if (gateHeaders.length !== 1) issues.push("invalid_acceptance_section");
  const gateSection =
    gateHeaders.length === 1 ? section.slice(gateHeaders[0]!.index) : "";
  const gateLines = [...gateSection.matchAll(/^- \[([ x])\] (.+)$/gm)];
  if (gateLines.length !== PHASE5_ACCEPTANCE_GATES.length)
    issues.push("invalid_acceptance_count");
  const pendingGates = PHASE5_ACCEPTANCE_GATES.flatMap((title, index) => {
    const matches = gateLines.filter(
      (line) => line[2] === title || line[2]!.startsWith(`${title} — `),
    );
    if (matches.length !== 1) issues.push(`missing_or_duplicate_gate:${index + 1}`);
    return matches.length === 1 && matches[0]![1] === "x" ? [] : [index + 1];
  });
  const checklistComplete =
    issues.length === 0 && pendingTasks.length === 0 && pendingGates.length === 0;
  return {
    checklistComplete,
    releaseAuthorized: false as const,
    decision: checklistComplete
      ? "MANUAL_RELEASE_APPROVAL_REQUIRED"
      : "CHECKLIST_INCOMPLETE",
    completedTasks: PHASE5_TASK_IDS.length - pendingTasks.length,
    totalTasks: PHASE5_TASK_IDS.length,
    pendingTasks,
    pendingGates,
    issues,
  };
}
