import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderSddTestResult, runSddTest, type SddTestCommandInput } from '@sdd-agent-platform/core/verification';
import { readBranchOption, readOptionalPositionalArgument } from '../args.js';
import { hasHelpFlag, hasPreflightFlag, readOption, readPositiveIntegerOption, readRepeatedOptions } from '../options.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleTestCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'test') {
    return null;
  }

  if (hasHelpFlag([subcommand, ...rest].filter((item): item is string => Boolean(item)))) {
    return {
      exitCode: 0,
      output: testTaskUsage()
    };
  }

  if (subcommand !== 'task') {
    return {
      exitCode: 2,
      error: testTaskUsage()
    };
  }

  const passthroughIndex = rest.indexOf('--');
  const cliArgs = passthroughIndex === -1 ? rest : rest.slice(0, passthroughIndex);
  const passthroughArgv = passthroughIndex === -1 ? [] : rest.slice(passthroughIndex + 1);
  const taskId = readOptionalPositionalArgument(cliArgs);
  if (!taskId) {
    return {
      exitCode: 2,
      error: testTaskUsage()
    };
  }

  if (hasPreflightFlag(cliArgs)) {
    return {
      exitCode: 0,
      output: wantsJson(cliArgs) ? jsonOutput({ contract: 'sdd-command-preflight-v1', command: 'test task', taskId, sideEffects: 'none', status: 'PASS' }, cliArgs) : `SDD command preflight PASS\ncommand=test task\ntask=${taskId}\nside_effects=none`
    };
  }

  let commandInputs: SddTestCommandInput[];
  try {
    commandInputs = await readCommandInputs(projectRoot, cliArgs, passthroughArgv);
  } catch (error) {
    return {
      exitCode: 2,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  const result = await runSddTest(projectRoot, {
    taskId,
    branch: readBranchOption(cliArgs),
    runId: readOption(cliArgs, '--run') ?? undefined,
    commands: readRepeatedOptions(cliArgs, '--command'),
    commandInputs,
    timeoutMs: readPositiveIntegerOption(cliArgs, '--timeout-ms') ?? undefined,
    approved: cliArgs.includes('--approved')
  });
  return {
    exitCode: result.status === 'PASS' ? 0 : 1,
    output: wantsJson(cliArgs) ? jsonOutput(result, cliArgs) : renderSddTestResult(result)
  };
}

async function readCommandInputs(projectRoot: string, cliArgs: string[], passthroughArgv: string[]): Promise<SddTestCommandInput[]> {
  const commandInputs: SddTestCommandInput[] = readRepeatedOptions(cliArgs, '--command').map((command) => ({ command }));
  const commandJsonValues = readRepeatedOptions(cliArgs, '--command-json');
  for (const raw of commandJsonValues) {
    commandInputs.push(...parseCommandInputJson(raw));
  }
  const commandFiles = readRepeatedOptions(cliArgs, '--command-file');
  for (const file of commandFiles) {
    const absolutePath = path.isAbsolute(file) ? file : path.resolve(projectRoot, file);
    commandInputs.push(...parseCommandInputJson(await readFile(absolutePath, 'utf8')));
  }
  if (passthroughArgv.length > 0) {
    commandInputs.push({ argv: passthroughArgv });
  }
  return commandInputs;
}

function parseCommandInputJson(raw: string): SddTestCommandInput[] {
  const parsed = JSON.parse(raw) as unknown;
  const items = Array.isArray(parsed) && parsed.every((item) => typeof item === 'object' && item !== null && ('command' in item || 'argv' in item)) ? parsed : [parsed];
  return items.map(parseCommandInputValue);
}

function parseCommandInputValue(value: unknown): SddTestCommandInput {
  if (typeof value === 'string') {
    return { command: value };
  }
  if (!value || typeof value !== 'object') {
    throw new Error('Command JSON must be a string, an object, or an array of command objects.');
  }
  const record = value as { command?: unknown; argv?: unknown };
  if (record.argv !== undefined) {
    if (!Array.isArray(record.argv) || !record.argv.every((item) => typeof item === 'string')) {
      throw new Error('Command JSON argv must be an array of strings.');
    }
    return { argv: record.argv };
  }
  if (typeof record.command === 'string') {
    return { command: record.command };
  }
  throw new Error('Command JSON object must include command or argv.');
}

function testTaskUsage(): string {
  return 'Usage: sdd test task <task_id> [--branch <branch>] [--run <run_id>] [--approved] [--command <command>] [--command-json <json>] [--command-file <path>] [--timeout-ms <ms>] [--preflight] [--json] [-- <executable> [...args]]';
}
