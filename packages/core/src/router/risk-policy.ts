import type { LifecycleAutonomyCeiling } from '../lifecycle/decision-gate.js';
import type { SddTask } from '../sdd-docs/task-parser.js';

export function taskAutonomyCeiling(task: SddTask): LifecycleAutonomyCeiling {
  const declared = task.autonomy?.trim();
  if (declared === 'direct_execution_allowed' || declared === 'compact_boundary_only' || declared === 'full_sdd_with_checkpoint' || declared === 'research_before_implementation') {
    return declared;
  }
  if (hasExternalUnknownRisk(task.risk)) {
    return 'research_before_implementation';
  }
  if (isHighRiskValues(task.risk)) {
    return 'full_sdd_with_checkpoint';
  }
  if (task.risk.length > 0) {
    return 'compact_boundary_only';
  }
  return 'direct_execution_allowed';
}

export function hasSecurityRisk(risk: string[]): boolean {
  return risk.some((item) => /security|auth|token|secret|permission|sql_injection|注入|安全/i.test(item));
}

export function hasExternalUnknownRisk(risk: string[]): boolean {
  return risk.some((item) => /external_unknown|external|third.?party|unknown|外部|未知/i.test(item));
}

export function isHighRiskValues(risk: string[]): boolean {
  return risk.some((item) => /state[-_]?machine|concurrency|database|data[-_]?loss|sql|security|api[-_]?schema|ci[-_]?build|external[-_]?unknown|迁移|并发|数据库|安全/i.test(item));
}
