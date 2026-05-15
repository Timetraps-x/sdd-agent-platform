import type { AiToolSelection } from '@sdd-agent-platform/core/ai-tools';
import type { RunStatus } from '@sdd-agent-platform/core/run-state';
import { resolveSddContext, type ContextBranchSource } from '@sdd-agent-platform/core/sdd-docs';
import type { SddResultStatus } from '@sdd-agent-platform/core/artifacts';
import type { GovernancePolicyOperation } from '@sdd-agent-platform/core/governance';
import type { ContextBuildMode } from '@sdd-agent-platform/core/context';
import type { WaveExecutorStrategy } from '@sdd-agent-platform/core/execution';
import type { TeamModeActivation } from '@sdd-agent-platform/core/router';
import { readOption } from './options.js';

export function readContextBuildMode(args: string[], name: string): ContextBuildMode | null {
  const value = readOption(args, name);
  return value === 'do' || value === 'verify' || value === 'sync-back' || value === 'doctor' ? value : null;
}

export function readTeamModeActivation(args: string[], fallback?: TeamModeActivation): TeamModeActivation | undefined {
  if (args.includes('--no-team-mode')) {
    return 'off';
  }
  const inline = args.find((item) => item.startsWith('--team-mode='));
  const inlineValue = inline?.split('=', 2)[1];
  if (inlineValue === 'auto' || inlineValue === 'force' || inlineValue === 'off') {
    return inlineValue;
  }
  const index = args.indexOf('--team-mode');
  if (index >= 0) {
    const value = args[index + 1];
    if (value === 'auto' || value === 'force' || value === 'off') {
      return value;
    }
    return 'force';
  }
  return fallback;
}

export function readBranchContext(args: string[]): { branch?: string; branchSource?: ContextBranchSource } {
  const branch = readBranchOption(args);
  return branch ? { branch, branchSource: 'cli_option' } : {};
}

export function readBranchOption(args: string[]): string | undefined {
  return readOption(args, '--branch') ?? undefined;
}

export function readOptionalPositionalArgument(args: string[]): string | undefined {
  const booleanOptions = new Set(['--approved', '--json', '--no-team-mode', '--force', '--check', '--latest-only', '--all-runs', '--scaffold-docs', '--no-scaffold-docs', '--direct-safe', '--external-unknown', '--architecture', '--checkpoint']);
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (!item.startsWith('--')) {
      return item;
    }
    if (item.includes('=')) {
      continue;
    }
    if (!booleanOptions.has(item) && args[index + 1] && !args[index + 1].startsWith('--')) {
      index += 1;
    }
  }
  return undefined;
}

export async function readResolvedBranch(projectRoot: string, args: string[]): Promise<string> {
  return (await resolveSddContext(projectRoot, readBranchContext(args))).branch;
}

export function readWaveExecutorStrategy(args: string[], name: string): WaveExecutorStrategy | null {
  const value = readOption(args, name) ?? 'fast-stop';
  return value === 'fast-stop' || value === 'safe-continue' ? value : null;
}

export function readRunStatus(args: string[], name: string): RunStatus | null {
  const value = readOption(args, name);
  return value === 'created' || value === 'running' || value === 'completed' || value === 'blocked' || value === 'failed' || value === 'archived' ? value : null;
}

export function readGovernancePolicyOperation(value: string | undefined): GovernancePolicyOperation | null {
  return value === 'background_executor' || value === 'wave_executor' || value === 'sync_back_apply' || value === 'destructive_git' || value === 'external_interaction' || value === 'cleanup' ? value : null;
}

export function readTaskArtifactOptions(args: string[]): Record<string, string> {
  const artifacts: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== '--artifact') {
      continue;
    }
    const value = args[index + 1];
    const separator = value?.indexOf(':') ?? -1;
    if (!value || separator <= 0) {
      continue;
    }
    artifacts[value.slice(0, separator)] = value.slice(separator + 1);
  }
  return artifacts;
}

export function readSddResultStatus(args: string[], name: string): SddResultStatus | null {
  const value = readOption(args, name);
  return value === 'PASS' || value === 'PASS_WITH_GAPS' || value === 'FAIL' || value === 'BLOCKED' || value === 'TIMED_OUT' || value === 'CANCELLED' ? value : null;
}

export function readAiToolSelection(args: string[], allowNone: boolean): AiToolSelection {
  const value = readOption(args, '--ai') ?? 'auto';
  if (value === 'auto' || value === 'claude-code' || (allowNone && value === 'none')) {
    return value;
  }
  throw new Error(`Unsupported --ai value: ${value}`);
}
