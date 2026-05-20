import type { LifecycleAutonomyCeiling } from '../lifecycle/decision-gate.js';
import type { SddTask } from '../sdd-docs/task-parser.js';
import { buildTaskRiskProfile } from '../task-risk-profile.js';

export function taskAutonomyCeiling(task: SddTask): LifecycleAutonomyCeiling {
  const declared = task.autonomy?.trim();
  if (declared === 'direct_execution_allowed' || declared === 'compact_boundary_only' || declared === 'full_sdd_with_checkpoint' || declared === 'research_before_implementation') {
    return declared;
  }
  const profile = buildTaskRiskProfile(task);
  if (profile.externalUnknown) {
    return 'research_before_implementation';
  }
  if (profile.riskLevel === 'high') {
    return 'full_sdd_with_checkpoint';
  }
  if (profile.riskLevel === 'medium') {
    return 'compact_boundary_only';
  }
  return 'direct_execution_allowed';
}

export function hasSecurityRisk(risk: string[]): boolean {
  return buildTaskRiskProfile({ id: null, risk, affectedFiles: [], validation: [], requiredArtifacts: [] }).securitySensitive;
}

export function hasExternalUnknownRisk(risk: string[]): boolean {
  return buildTaskRiskProfile({ id: null, risk, affectedFiles: [], validation: [], requiredArtifacts: [] }).externalUnknown;
}

export function isHighRiskValues(risk: string[]): boolean {
  return buildTaskRiskProfile({ id: null, risk, affectedFiles: [], validation: [], requiredArtifacts: [] }).riskLevel === 'high';
}
