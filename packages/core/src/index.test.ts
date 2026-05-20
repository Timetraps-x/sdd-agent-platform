import assert from 'node:assert/strict';
import test from 'node:test';
import type { CodingFactSet } from './coding-facts.js';
import type { LifecycleRiskDecision } from './risk.js';
import type { StageRun, WorkflowHandoff, WorkflowStageHandoffDiagnostic } from './stage-runtime.js';
import type { WorkUnit } from './work-units.js';
import type { SubagentDefinition } from './subagents.js';
import type { ContextOffloadDecision } from './context-offload.js';
import type { UnifiedTestEvidenceRun } from './evidence-runtime.js';

test('Phase 8 public facades expose contract types', () => {
  const names: Array<keyof {
    facts: CodingFactSet;
    risk: LifecycleRiskDecision;
    stage: StageRun;
    handoff: WorkflowHandoff;
    handoffDiagnostic: WorkflowStageHandoffDiagnostic;
    work: WorkUnit;
    subagent: SubagentDefinition;
    context: ContextOffloadDecision;
    evidence: UnifiedTestEvidenceRun;
  }> = ['facts', 'risk', 'stage', 'handoff', 'handoffDiagnostic', 'work', 'subagent', 'context', 'evidence'];

  assert.deepEqual(names, ['facts', 'risk', 'stage', 'handoff', 'handoffDiagnostic', 'work', 'subagent', 'context', 'evidence']);
});
