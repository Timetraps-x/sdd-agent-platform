import { handleRegistryContractCommand } from './registry/contracts.js';
import { handleRegistryCoreCommand } from './registry/core.js';
import { handleRegistryPlatformCommand } from './registry/platform.js';
import { handleRegistryRuntimeCommand } from './registry/runtime.js';
import type { CliResult } from './registry/types.js';

export type { CliResult } from './registry/types.js';

export async function handleRegistryCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  return await handleRegistryCoreCommand(projectRoot, command, subcommand, rest)
    ?? await handleRegistryRuntimeCommand(projectRoot, command, subcommand, rest)
    ?? await handleRegistryContractCommand(projectRoot, command, subcommand, rest)
    ?? await handleRegistryPlatformCommand(projectRoot, command, subcommand, rest);
}