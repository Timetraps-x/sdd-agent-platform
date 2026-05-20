import { inspectVerifyContract, writeVerifyContract, type VerifyContractInspection, type WriteVerifyContractResult } from '@sdd-agent-platform/core/verification';
import { readBranchContext } from '../args.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleVerifiesCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'verifies') {
    return null;
  }

  const args = [subcommand, ...rest].filter((item): item is string => Boolean(item));
  if (!subcommand || subcommand === 'inspect') {
    const result = await inspectVerifyContract(projectRoot, readBranchContext(args));
    return {
      exitCode: result.status === 'BLOCKED' ? 1 : 0,
      output: wantsJson(args) ? jsonOutput(result, args) : renderVerifyContractInspection(result)
    };
  }

  if (subcommand === 'write') {
    const result = await writeVerifyContract(projectRoot, {
      ...readBranchContext(args),
      force: args.includes('--force')
    });
    return {
      exitCode: 0,
      output: wantsJson(args) ? jsonOutput(result, args) : renderWriteVerifyContractResult(result)
    };
  }

  if (subcommand === 'format') {
    return {
      exitCode: 0,
      output: verifyContractFormatText()
    };
  }

  return {
    exitCode: 2,
    error: 'Usage: sdd verifies [inspect|write|format] [--branch <branch>] [--force] [--json]'
  };
}

function renderVerifyContractInspection(result: VerifyContractInspection): string {
  const lines = [`SDD verify contract for ${result.branch}`, 'decision'];
  lines.push(`- status=${result.status}`);
  lines.push(`- exists=${result.exists} tasks=${result.taskCount}`);
  lines.push(`- based_on_tasks_hash=${result.basedOnTasksHash ?? 'none'} current_tasks_hash=${result.currentTasksHash ?? 'none'}`);
  lines.push('evidence');
  lines.push(`- verify_path=${result.verifyPath}`);
  lines.push('gaps');
  if (result.issues.length === 0) {
    lines.push('- none');
  } else {
    for (const issue of result.issues) {
      lines.push(`- [${issue.level}] ${issue.field}: ${issue.message}`);
      lines.push(`  action: ${issue.action}`);
    }
  }
  lines.push('next');
  lines.push(result.status === 'PASS' ? '- sdd test task <task_id> --branch <branch>' : `- sdd verifies write --branch ${result.branch}${result.exists ? ' --force' : ''}`);
  return lines.join('\n');
}

function renderWriteVerifyContractResult(result: WriteVerifyContractResult): string {
  return [
    `SDD verify contract ${result.status}`,
    'changed',
    `- ${result.relativePath}`,
    'decision',
    `- branch=${result.branch}`,
    'next',
    `- sdd verifies inspect --branch ${result.branch}`
  ].join('\n');
}

function verifyContractFormatText(): string {
  return `# Verify contract format

\`specs/<branch>/verify.md\` is derived from \`tasks.md\` and must include frontmatter:

\`\`\`yaml
contract: sdd-verify-doc-v1
version: 1.0.0
branch: <branch>
based_on_tasks_hash: <current tasks hash>
\`\`\`

Include a task verification matrix and verification rules. Runtime evidence remains in runtime.sqlite and branch evidence artifacts.`;
}
