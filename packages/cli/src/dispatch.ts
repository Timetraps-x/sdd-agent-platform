import { handleAiToolsCommand } from './commands/ai-tools.js';
import { handleArtifactCommand } from './commands/artifact.js';
import { handleContextCommand } from './commands/context.js';
import { handleDoctorCommand } from './commands/doctor.js';
import { handleExecutionCommand } from './commands/execution.js';
import { handleGovernanceCommand } from './commands/governance.js';
import { handleInitCommand } from './commands/init.js';
import { handleInstructionsCommand } from './commands/instructions.js';
import { handleLifecycleCommand } from './commands/lifecycle.js';
import { handleRegistryCommand } from './commands/registry.js';
import { handleRunCommand } from './commands/run.js';
import { handleStatusCommand } from './commands/status.js';
import { handleShipCommand } from './commands/ship.js';
import { handleSyncBackCommand } from './commands/sync-back.js';
import { handleTasksCommand } from './commands/tasks.js';
import { handleTestCommand } from './commands/test.js';
import { handleVerifyCommand } from './commands/verify.js';
import { handleVerifiesCommand } from './commands/verifies.js';
import { helpText } from './help.js';
import { getCliIdentity } from './identity.js';
import { jsonOutput, wantsJson } from './renderers/json.js';

interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function dispatchCli(args: string[], importMetaUrl = import.meta.url): Promise<CliResult> {
  const projectRoot = process.cwd();
  const [command, subcommand, ...rest] = args;

  if (!command || command === '--help' || command === '-h') {
    return {
      exitCode: 0,
      output: helpText()
    };
  }

  if (command === 'help') {
    return {
      exitCode: 0,
      output: helpText(subcommand)
    };
  }

  if (command === '--version' || command === '-v' || command === 'version') {
    const identity = getCliIdentity(importMetaUrl);
    return {
      exitCode: 0,
      output: wantsJson(args) ? jsonOutput(identity, args) : identity.version
    };
  }

  const initResult = await handleInitCommand(projectRoot, command, subcommand, rest);
  if (initResult) {
    return initResult;
  }

  const aiToolsResult = await handleAiToolsCommand(projectRoot, command, subcommand, rest);
  if (aiToolsResult) {
    return aiToolsResult;
  }

  const instructionsResult = await handleInstructionsCommand(command, subcommand, rest);
  if (instructionsResult) {
    return instructionsResult;
  }

  const doctorResult = await handleDoctorCommand(projectRoot, command, subcommand, rest);
  if (doctorResult) {
    return doctorResult;
  }

  const statusResult = await handleStatusCommand(projectRoot, command, subcommand, rest);
  if (statusResult) {
    return statusResult;
  }

  const runResult = await handleRunCommand(projectRoot, command, subcommand, rest);
  if (runResult) {
    return runResult;
  }

  const artifactResult = await handleArtifactCommand(projectRoot, command, subcommand, rest);
  if (artifactResult) {
    return artifactResult;
  }

  const governanceResult = await handleGovernanceCommand(projectRoot, command, subcommand, rest);
  if (governanceResult) {
    return governanceResult;
  }

  const syncBackResult = await handleSyncBackCommand(projectRoot, command, subcommand, rest);
  if (syncBackResult) {
    return syncBackResult;
  }

  const shipResult = await handleShipCommand(projectRoot, command, subcommand, rest);
  if (shipResult) {
    return shipResult;
  }

  const contextResult = await handleContextCommand(projectRoot, command, subcommand, rest);
  if (contextResult) {
    return contextResult;
  }

  const tasksResult = await handleTasksCommand(projectRoot, command, subcommand, rest);
  if (tasksResult) {
    return tasksResult;
  }

  const lifecycleResult = await handleLifecycleCommand(projectRoot, command, subcommand, rest);
  if (lifecycleResult) {
    return lifecycleResult;
  }

  const verifiesResult = await handleVerifiesCommand(projectRoot, command, subcommand, rest);
  if (verifiesResult) {
    return verifiesResult;
  }

  const testResult = await handleTestCommand(projectRoot, command, subcommand, rest);
  if (testResult) {
    return testResult;
  }

  const verifyResult = await handleVerifyCommand(projectRoot, command, subcommand, rest);
  if (verifyResult) {
    return verifyResult;
  }

  const registryResult = await handleRegistryCommand(projectRoot, command, subcommand, rest);
  if (registryResult) {
    return registryResult;
  }

  const executionResult = await handleExecutionCommand(projectRoot, command, subcommand, rest);
  if (executionResult) {
    return executionResult;
  }

  return {
    exitCode: 2,
    error: `Unknown command: ${args.join(' ')}\n\n${helpText()}`
  };
}
