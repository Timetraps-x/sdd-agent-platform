import { readFile } from 'node:fs/promises';
import { evaluateLifecycleDecisionGate, recordLifecycleDecision } from '@sdd-agent-platform/core/lifecycle';
import { renderLifecycleDecisionGate } from '@sdd-agent-platform/core/lifecycle';
import { extractLifecycleRiskSignalsFromText, type LifecycleDecisionSignals, type LifecycleRiskGateExtraction } from '@sdd-agent-platform/core/lifecycle';
import { readOption, readRepeatedOptions } from '../options.js';
import { renderLifecycleRiskExtraction } from '../renderers/lifecycle.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleLifecycleCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'lifecycle' || subcommand !== 'decide') {
    return null;
  }

  const lifecycleInput = await readLifecycleSignalOptions(rest);
  if (lifecycleInput.error) {
    return {
      exitCode: 2,
      error: lifecycleInput.error
    };
  }
  const result = evaluateLifecycleDecisionGate(lifecycleInput.signals);
  const runId = readOption(rest, '--run');
  if (runId) {
    await recordLifecycleDecision(projectRoot, runId, result.record);
  }
  const json = rest.includes('--json');
  return {
    exitCode: 0,
    output: json
      ? JSON.stringify({ riskExtraction: lifecycleInput.riskExtraction, ...result, recordedRunId: runId ?? null }, null, 2)
      : `${renderLifecycleRiskExtraction(lifecycleInput.riskExtraction)}${renderLifecycleDecisionGate(result)}${runId ? `\nrecorded_run=${runId}` : ''}`
  };
}

async function readLifecycleSignalOptions(args: string[]): Promise<{ signals: Partial<LifecycleDecisionSignals>; riskExtraction: LifecycleRiskGateExtraction | null; error?: string }> {
  const directSafe = args.includes('--direct-safe');
  const riskTags = readRepeatedOptions(args, '--risk');
  const contracts = readRepeatedOptions(args, '--contract');
  const permissions = readRepeatedOptions(args, '--permission');
  const fromText = readOption(args, '--from-text');
  const fromFile = readOption(args, '--from-file');
  if (fromText && fromFile) {
    return { signals: {}, riskExtraction: null, error: 'Usage: sdd lifecycle decide accepts only one of --from-text or --from-file' };
  }
  const riskExtraction = fromText
    ? extractLifecycleRiskSignalsFromText(fromText, 'from_text')
    : fromFile
      ? extractLifecycleRiskSignalsFromText(await readFile(fromFile, 'utf8'), 'from_file')
      : null;
  const extracted = riskExtraction?.signals ?? {};
  const signals: Partial<LifecycleDecisionSignals> = {
    intent_clarity: directSafe ? 'high' as const : readSignalClarity(args, '--intent') ?? 'medium' as const,
    acceptance_clarity: directSafe ? 'high' as const : readSignalClarity(args, '--acceptance') ?? 'medium' as const,
    estimated_change_size: directSafe ? 'tiny' as const : readEstimatedChangeSize(args, '--size') ?? 'small' as const,
    task_count_estimate: Number(readOption(args, '--tasks') ?? (directSafe ? '1' : '1')),
    file_count_estimate: Number(readOption(args, '--files') ?? (directSafe ? '1' : '1')),
    affected_layers: readRepeatedOptions(args, '--layer'),
    affected_contracts: uniqueCliStrings([...contracts, ...(extracted.affected_contracts ?? [])]),
    dependency_fanout: readDependencyFanout(args, '--fanout') ?? 'local' as const,
    impact_confidence: directSafe ? 'high' as const : extracted.impact_confidence ?? readImpactConfidence(args, '--impact-confidence') ?? 'medium' as const,
    risk_tags: uniqueCliStrings([...riskTags, ...(extracted.risk_tags ?? [])]),
    reversibility: directSafe ? 'reversible' as const : extracted.reversibility ?? readReversibility(args, '--reversibility') ?? 'unknown' as const,
    validation_clarity: directSafe ? 'clear' as const : extracted.validation_clarity ?? readValidationClarity(args, '--validation') ?? 'partial' as const,
    validation_available: directSafe || args.includes('--validation-available'),
    validation_cost: directSafe ? 'cheap' as const : readValidationCost(args, '--validation-cost') ?? 'unknown' as const,
    policy_hits: readRepeatedOptions(args, '--policy'),
    permission_required: permissions,
    requires_agents: args.includes('--requires-agents'),
    handoff_count: Number(readOption(args, '--handoffs') ?? '0'),
    artifact_dependency: args.includes('--artifact-dependency'),
    runtime_recovery_need: args.includes('--runtime-recovery'),
    orchestration_uncertainty: directSafe ? 'low' as const : readOrchestrationUncertainty(args, '--orchestration') ?? 'medium' as const,
    human_checkpoint_required: args.includes('--checkpoint'),
    approval_reason: readRepeatedOptions(args, '--approval-reason'),
    source_artifacts: uniqueCliStrings([...readRepeatedOptions(args, '--source-artifact'), ...(fromFile ? [fromFile] : [])]),
    can_scout_impact: !args.includes('--cannot-scout-impact'),
    architecture_decision_required: args.includes('--architecture') || Boolean(extracted.architecture_decision_required),
    external_unknown: args.includes('--external-unknown') || Boolean(extracted.external_unknown)
  };
  return { signals, riskExtraction };
}

function uniqueCliStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function readSignalClarity(args: string[], name: string): 'high' | 'medium' | 'low' | null {
  const value = readOption(args, name);
  return value === 'high' || value === 'medium' || value === 'low' ? value : null;
}

function readEstimatedChangeSize(args: string[], name: string): 'tiny' | 'small' | 'medium' | 'large' | null {
  const value = readOption(args, name);
  return value === 'tiny' || value === 'small' || value === 'medium' || value === 'large' ? value : null;
}

function readImpactConfidence(args: string[], name: string): 'high' | 'medium' | 'low' | null {
  return readSignalClarity(args, name);
}

function readValidationClarity(args: string[], name: string): 'clear' | 'partial' | 'unclear' | null {
  const value = readOption(args, name);
  return value === 'clear' || value === 'partial' || value === 'unclear' ? value : null;
}

function readValidationCost(args: string[], name: string): 'cheap' | 'moderate' | 'expensive' | 'unknown' | null {
  const value = readOption(args, name);
  return value === 'cheap' || value === 'moderate' || value === 'expensive' || value === 'unknown' ? value : null;
}

function readDependencyFanout(args: string[], name: string): 'none' | 'local' | 'multi_component' | 'unknown' | null {
  const value = readOption(args, name);
  return value === 'none' || value === 'local' || value === 'multi_component' || value === 'unknown' ? value : null;
}

function readReversibility(args: string[], name: string): 'reversible' | 'irreversible' | 'unknown' | null {
  const value = readOption(args, name);
  return value === 'reversible' || value === 'irreversible' || value === 'unknown' ? value : null;
}

function readOrchestrationUncertainty(args: string[], name: string): 'low' | 'medium' | 'high' | null {
  const value = readOption(args, name);
  return value === 'low' || value === 'medium' || value === 'high' ? value : null;
}
