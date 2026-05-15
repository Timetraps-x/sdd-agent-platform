import type { SddTask, SddTaskGap } from '../sdd-docs/task-parser.js';
import { appendTaskGaps } from '../sdd-docs/task-rendering.js';

export type GoalVerifyStatus = 'PASS' | 'PASS_WITH_GAPS' | 'FAIL' | 'BLOCKED';
export type HarnessVerifyStatus = 'PASS' | 'GAPS' | 'BLOCKED' | 'HUMAN_NEEDED';
export type SingleTaskLoopStatus = 'completed' | 'blocked' | 'failed';

type LoopAgent = 'implementer' | 'reviewer' | 'debugger' | 'validator';

interface AcceptanceCoverageItemLike {
  acceptance: string;
  status: string;
  evidence: string;
}

export interface GoalVerifyResultLike {
  runId: string;
  taskId: string;
  status: GoalVerifyStatus;
  standardStatus: HarnessVerifyStatus;
  task: SddTask | null;
  reviewArtifact: string | null;
  validationArtifact: string | null;
  coverageArtifactPath: string;
  syncBackProposalPath: string;
  acceptanceCoverage: AcceptanceCoverageItemLike[];
  commands: string[];
  gaps: SddTaskGap[];
  message: string;
}

export interface SingleTaskLoopResultLike {
  runId: string;
  taskId: string;
  status: SingleTaskLoopStatus;
  task: SddTask | null;
  gaps: SddTaskGap[];
  requiredArtifacts: string[];
  acceptedArtifacts: string[];
  routeDecision: {
    category: string;
    recommendedProfile: string | null;
    autonomyCeiling: string;
    teamMode: {
      decision: string;
      mode: string;
      activation: string;
      costClass: string;
    };
  };
  syncBackProposalPath: string | null;
  message: string;
}

export function renderGoalVerifyResult(result: GoalVerifyResultLike): string {
  const lines = ['SDD verify task result', 'changed'];
  lines.push(`- acceptance coverage written to ${result.coverageArtifactPath}`);
  lines.push(`- sync-back proposal written to ${result.syncBackProposalPath}`);
  lines.push('decision');
  lines.push(`- status=${result.status}`);
  lines.push(`- standard_status=${result.standardStatus}`);
  lines.push(`- message=${result.message}`);
  lines.push('evidence');
  lines.push(`- run=${result.runId}`);
  lines.push(`- task=${result.taskId}`);
  lines.push('- artifact_path_scope=CLI flags use run-relative artifacts/<file>; physical files live under .sdd/runs/<run_id>/artifacts/<file>');
  lines.push(`- review_artifact=${result.reviewArtifact ?? 'none'}`);
  lines.push(`- validation_artifact=${result.validationArtifact ?? 'none'}`);
  lines.push(`- commands=${result.commands.join(', ') || 'none'}`);
  if (result.acceptanceCoverage.length === 0) {
    lines.push('- acceptance_coverage=none');
  } else {
    for (const item of result.acceptanceCoverage) {
      lines.push(`- acceptance ${item.status}: ${item.acceptance} evidence=${item.evidence}`);
    }
  }
  lines.push('gaps');
  if (result.gaps.length === 0) {
    lines.push('- none');
  } else {
    appendTaskGaps(lines, result.gaps, result.taskId);
  }
  lines.push('next');
  if (result.status === 'PASS') {
    lines.push(`- sdd sync-back inspect ${result.runId} --task ${result.taskId}`);
  } else {
    lines.push(`- update review/validator artifacts and rerun sdd verify task ${result.taskId} --run ${result.runId}`);
  }
  return lines.join('\n');
}

export function renderSingleTaskLoopResult(result: SingleTaskLoopResultLike): string {
  const lines = ['SDD do task result', 'changed'];
  lines.push(`- run ${result.runId} created or updated for task ${result.taskId}`);
  if (result.acceptedArtifacts.length > 0) {
    lines.push(`- accepted artifacts: ${result.acceptedArtifacts.join(', ')}`);
  }
  lines.push('decision');
  lines.push(`- status=${result.status}`);
  lines.push(`- message=${result.message}`);
  lines.push(`- router category=${result.routeDecision.category} recommended_profile=${result.routeDecision.recommendedProfile ?? 'none'} autonomy=${result.routeDecision.autonomyCeiling}`);
  lines.push(`- team_mode=${result.routeDecision.teamMode.decision} mode=${result.routeDecision.teamMode.mode} activation=${result.routeDecision.teamMode.activation} cost=${result.routeDecision.teamMode.costClass}`);
  lines.push('evidence');
  lines.push('- artifact_path_scope=CLI flags use run-relative artifacts/<file>; physical files live under .sdd/runs/<run_id>/artifacts/<file>');
  lines.push(`- required_artifacts=${result.requiredArtifacts.join(',') || 'none'}`);
  lines.push(`- accepted_artifacts=${result.acceptedArtifacts.join(',') || 'none'}`);
  lines.push(`- sync_back_proposal=${result.syncBackProposalPath || 'none'}`);
  lines.push(`- agent_execution_records=.sdd/runs/${result.runId}/agent-executions/`);
  lines.push(`- team_session_records=.sdd/runs/${result.runId}/team-sessions/`);
  lines.push('gaps');
  if (result.gaps.length === 0) {
    lines.push('- none');
  } else {
    appendTaskGaps(lines, result.gaps, result.taskId);
  }
  lines.push('next');
  if (result.status === 'completed') {
    lines.push(`- sdd verify task ${result.taskId} --run ${result.runId}`);
  } else {
    const missingArtifacts = result.requiredArtifacts.filter((artifact) => !result.acceptedArtifacts.includes(artifact));
    if (missingArtifacts.length > 0) {
      lines.push(`- create or validate missing run-relative artifacts: ${missingArtifacts.join(', ')}`);
      lines.push(`- physical artifact files belong under .sdd/runs/${result.runId}/artifacts/`);
    }
    const artifactFlags = missingArtifacts
      .map((artifact) => ({ artifact, agent: agentForLoopArtifact(artifact) }))
      .filter((item): item is { artifact: string; agent: LoopAgent } => Boolean(item.agent));
    for (const item of artifactFlags) {
      lines.push(`- sdd artifact template ${item.artifact} --task ${result.taskId} --agent ${item.agent} --run ${result.runId} --write`);
    }
    const rerunFlags = artifactFlags.map((item) => `${artifactOptionName(item.agent)} ${item.artifact}`).join(' ');
    lines.push(`- sdd do task ${result.taskId} --run ${result.runId}${rerunFlags ? ` ${rerunFlags}` : ''}`);
  }
  return lines.join('\n');
}

function agentForLoopArtifact(artifactPath: string): LoopAgent | null {
  const filename = artifactPath.replace(/\\/g, '/').split('/').pop() ?? '';
  if (filename.startsWith('implement-')) {
    return 'implementer';
  }
  if (filename.startsWith('review-')) {
    return 'reviewer';
  }
  if (filename.startsWith('debug-')) {
    return 'debugger';
  }
  if (filename.startsWith('validation-')) {
    return 'validator';
  }
  return null;
}

function artifactOptionName(agent: string): string {
  if (agent === 'implementer') {
    return '--implement-artifact';
  }
  if (agent === 'reviewer') {
    return '--review-artifact';
  }
  if (agent === 'debugger') {
    return '--debug-artifact';
  }
  if (agent === 'validator') {
    return '--validation-artifact';
  }
  return '--artifact';
}
