import { evaluateGovernancePolicy, inspectGovernancePolicy } from '@sdd-agent-platform/core/governance';
import { readGovernancePolicyOperation } from '../args.js';
import { readOption, readRepeatedOption } from '../options.js';
import { renderGovernancePolicy, renderGovernancePolicyDecision } from '../renderers/governance.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleGovernanceCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'governance') {
    return null;
  }

  if (subcommand === 'inspect') {
    const policy = await inspectGovernancePolicy(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(policy, null, 2) : renderGovernancePolicy(policy)
    };
  }

  if (subcommand === 'evaluate') {
    const operation = readGovernancePolicyOperation(rest[0]);
    if (!operation) {
      return {
        exitCode: 2,
        error: 'Usage: sdd governance evaluate background_executor|wave_executor|sync_back_apply|destructive_git|external_interaction|cleanup [--worker <adapter_id>] [--risk <tag>] [--approved] [--json]'
      };
    }
    const decision = await evaluateGovernancePolicy(projectRoot, {
      operation,
      workerAdapterId: readOption(rest, '--worker') ?? undefined,
      riskTags: readRepeatedOption(rest, '--risk'),
      approved: rest.includes('--approved')
    });
    return {
      exitCode: decision.allowed ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(decision, null, 2) : renderGovernancePolicyDecision(decision)
    };
  }

  return null;
}
