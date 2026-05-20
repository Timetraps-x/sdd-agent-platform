import type { HarnessLearningContract, HarnessLearningValidation, ProjectContextPackContract, ProjectContextPackValidation, SkillAgentEvalContract, SkillAgentEvalValidation } from '@sdd-agent-platform/core/registries';
import type { QueryStatusContract, QueryStatusValidation } from '@sdd-agent-platform/core/registries';

export function renderQueryStatusContract(contract: QueryStatusContract): string {
  const lines = ['SDD query status contract'];
  lines.push(`version=${contract.version}`);
  lines.push(`source=${contract.sourceDocument}`);
  for (const surface of contract.surfaces) {
    lines.push(`- ${surface.id} command=${surface.command}`);
    lines.push(`  responsibility=${surface.responsibility}`);
    lines.push(`  includes=${surface.includes.join(',')}`);
    lines.push(`  excludes=${surface.excludes.join(',')}`);
    lines.push(`  next=${surface.nextActionRule}`);
  }
  return lines.join('\n');
}

export function renderQueryStatusValidation(result: QueryStatusValidation): string {
  const lines = ['SDD query status validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`surfaces=${result.surfaces.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

export function renderSkillAgentEvalContract(contract: SkillAgentEvalContract): string {
  const lines = ['SDD skill/agent eval contract'];
  lines.push(`version=${contract.version}`);
  lines.push(`source=${contract.sourceReport}`);
  lines.push(`corpus=${contract.corpus.length}`);
  lines.push('dimensions');
  for (const dimension of contract.dimensions) {
    lines.push(`- ${dimension.id} threshold=${dimension.passThreshold}`);
    lines.push(`  expectation=${dimension.expectation}`);
    lines.push(`  baseline=${dimension.baselineFinding}`);
  }
  lines.push('regression_assertions');
  for (const assertion of contract.regressionAssertions) {
    lines.push(`- ${assertion}`);
  }
  return lines.join('\n');
}

export function renderSkillAgentEvalValidation(result: SkillAgentEvalValidation): string {
  const lines = ['SDD skill/agent eval validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`dimensions=${result.contract.dimensions.length}`);
  lines.push(`corpus=${result.contract.corpus.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

export function renderHarnessLearningContract(contract: HarnessLearningContract): string {
  const lines = ['SDD harness learning contract'];
  lines.push(`version=${contract.version}`);
  lines.push(`source=${contract.sourceTrial}`);
  lines.push(`promotion=${contract.promotionRule}`);
  lines.push('allowed_sinks');
  for (const sink of contract.allowedSinks) {
    lines.push(`- ${sink.id}: ${sink.output}`);
    lines.push(`  boundary=${sink.boundary}`);
  }
  lines.push('forbidden_outputs');
  for (const output of contract.forbiddenOutputs) {
    lines.push(`- ${output}`);
  }
  return lines.join('\n');
}

export function renderHarnessLearningValidation(result: HarnessLearningValidation): string {
  const lines = ['SDD harness learning validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`allowed_sinks=${result.contract.allowedSinks.length}`);
  lines.push(`forbidden_outputs=${result.contract.forbiddenOutputs.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}

export function renderProjectContextPackContract(contract: ProjectContextPackContract): string {
  const lines = ['SDD project context pack contract'];
  lines.push(`version=${contract.version}`);
  lines.push(`entry=${contract.entryPoint}`);
  lines.push('durable_context');
  for (const item of contract.durableContext) {
    lines.push(`- ${item}`);
  }
  lines.push('runtime_sources_of_truth');
  for (const source of contract.runtimeSourcesOfTruth) {
    lines.push(`- ${source}`);
  }
  lines.push('boundaries');
  for (const boundary of contract.boundaries) {
    lines.push(`- ${boundary}`);
  }
  return lines.join('\n');
}

export function renderProjectContextPackValidation(result: ProjectContextPackValidation): string {
  const lines = ['SDD project context pack validation'];
  lines.push(`valid=${result.valid}`);
  lines.push(`entry=${result.contract.entryPoint}`);
  lines.push(`runtime_sources=${result.contract.runtimeSourcesOfTruth.length}`);
  lines.push('issues');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- ${issue.field}: ${issue.message}`);
    }
  }
  return lines.join('\n');
}
