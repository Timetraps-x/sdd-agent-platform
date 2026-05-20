import { decideCommandTeamRuntime, inspectAgentCapabilityCatalog, inspectCommandTeamRuntime, validateAgentCapabilityCatalog, validateCommandTeamRuntime } from '@sdd-agent-platform/core/registries';
import { inspectAgentSkillTeamRuntime, inspectCapabilitySource, inspectExternalAgentPackImport, inspectSkillCapability, inspectTeamModePolicy, listCapabilitySources, listSkillCapabilities, validateAgentSkillTeamRuntime } from '@sdd-agent-platform/core/router';
import { readBranchOption, readTeamModeActivation } from '../../args.js';
import { readOption, readRepeatedOptions } from '../../options.js';
import {
  renderAgentCapabilityCatalog,
  renderAgentCapabilityCatalogValidation,
  renderAgentSkillTeamRuntimeInspection,
  renderAgentSkillTeamRuntimeValidation,
  renderCapabilitySourceInspect,
  renderCapabilitySourceList,
  renderCommandTeamRuntimeDecision,
  renderCommandTeamRuntimeInspection,
  renderCommandTeamRuntimeValidation,
  renderExternalAgentPackImportInspection,
  renderSkillCapabilityInspect,
  renderSkillCapabilityList,
  renderTeamModePolicy
} from '../../renderers/registry-runtime.js';
import type { CliResult } from './types.js';

export async function handleRegistryRuntimeCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command === 'agent-runtime' && subcommand === 'inspect') {
    const inspection = await inspectAgentSkillTeamRuntime(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(inspection, null, 2) : renderAgentSkillTeamRuntimeInspection(inspection)
    };
  }

  if (command === 'agent-runtime' && subcommand === 'validate') {
    const result = await validateAgentSkillTeamRuntime(projectRoot);
    return {
      exitCode: result.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(result, null, 2) : renderAgentSkillTeamRuntimeValidation(result)
    };
  }

  if (command === 'agent-capabilities' && subcommand === 'list') {
    const catalog = await inspectAgentCapabilityCatalog(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(catalog, null, 2) : renderAgentCapabilityCatalog(catalog)
    };
  }

  if (command === 'agent-capabilities' && subcommand === 'validate') {
    const validation = await validateAgentCapabilityCatalog(projectRoot);
    return {
      exitCode: validation.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(validation, null, 2) : renderAgentCapabilityCatalogValidation(validation)
    };
  }

  if (command === 'command-team' && subcommand === 'inspect') {
    const inspection = await inspectCommandTeamRuntime(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(inspection, null, 2) : renderCommandTeamRuntimeInspection(inspection)
    };
  }

  if (command === 'command-team' && subcommand === 'validate') {
    const validation = await validateCommandTeamRuntime(projectRoot);
    return {
      exitCode: validation.valid ? 0 : 1,
      output: rest.includes('--json') ? JSON.stringify(validation, null, 2) : renderCommandTeamRuntimeValidation(validation)
    };
  }

  if (command === 'command-team' && subcommand === 'decide') {
    const commandOption = readOption(rest, '--command');
    if (!commandOption) {
      return {
        exitCode: 2,
        error: 'Usage: sdd command-team decide --command <command> [--risk <tag>] [--team-mode auto|force|off] [--json]'
      };
    }
    const decision = await decideCommandTeamRuntime(projectRoot, {
      command: commandOption as Parameters<typeof decideCommandTeamRuntime>[1]['command'],
      activation: readTeamModeActivation(rest),
      riskTags: readRepeatedOptions(rest, '--risk')
    });
    return {
      exitCode: decision.mode === 'blocked' ? 1 : 0,
      output: rest.includes('--json') ? JSON.stringify(decision, null, 2) : renderCommandTeamRuntimeDecision(decision)
    };
  }

  if (command === 'skill-capabilities' && subcommand === 'list') {
    const registry = await listSkillCapabilities(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(registry, null, 2) : renderSkillCapabilityList(registry.capabilities, registry.registrySources)
    };
  }

  if (command === 'skill-capabilities' && subcommand === 'inspect') {
    const capabilityId = rest.find((item) => !item.startsWith('--'));
    if (!capabilityId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd skill-capabilities inspect <capability_id> [--json]'
      };
    }
    const capability = await inspectSkillCapability(projectRoot, capabilityId);
    if (!capability) {
      return { exitCode: 1, error: `Unknown skill capability: ${capabilityId}` };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(capability, null, 2) : renderSkillCapabilityInspect(capability)
    };
  }

  if (command === 'capability-sources' && subcommand === 'list') {
    const catalog = await listCapabilitySources(projectRoot);
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(catalog, null, 2) : renderCapabilitySourceList(catalog.sources, catalog.registrySources)
    };
  }

  if (command === 'capability-sources' && subcommand === 'inspect') {
    const sourceId = rest.find((item) => !item.startsWith('--'));
    if (!sourceId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd capability-sources inspect <source_id> [--json]'
      };
    }
    const source = await inspectCapabilitySource(projectRoot, sourceId);
    if (!source) {
      return { exitCode: 1, error: `Unknown capability source: ${sourceId}` };
    }
    return {
      exitCode: 0,
      output: rest.includes('--json') ? JSON.stringify(source, null, 2) : renderCapabilitySourceInspect(source)
    };
  }

  if (command === 'external-packs' && subcommand === 'inspect') {
    const sourceId = rest.find((item) => !item.startsWith('--'));
    if (!sourceId) {
      return {
        exitCode: 2,
        error: 'Usage: sdd external-packs inspect <source_id> [--json]'
      };
    }
    const inspection = await inspectExternalAgentPackImport(projectRoot, sourceId);
    return {
      exitCode: inspection.status === 'denied' ? 1 : 0,
      output: rest.includes('--json') ? JSON.stringify(inspection, null, 2) : renderExternalAgentPackImportInspection(inspection)
    };
  }

  if (command === 'team-mode' && subcommand === 'inspect') {
    const policy = await inspectTeamModePolicy(projectRoot, {
      taskId: readOption(rest, '--task') ?? undefined,
      branch: readBranchOption(rest),
      teamModeActivation: readTeamModeActivation(rest, rest.includes('--enabled') ? 'force' : undefined)
    });
    return {
      exitCode: policy.decision === 'blocked' ? 1 : 0,
      output: rest.includes('--json') ? JSON.stringify(policy, null, 2) : renderTeamModePolicy(policy)
    };
  }

  return null;
}
