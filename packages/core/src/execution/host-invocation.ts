import { spawn } from 'node:child_process';

import { SDD_RESULT_CONTRACT, SDD_RESULT_VERSION } from '../contracts.js';
import { writeArtifact } from '../run-state/artifacts.js';

export interface HostInvocationCommandOptions {
  command?: string;
  args?: string[];
}

export interface HostInvocationInput {
  projectRoot: string;
  runId: string;
  taskId: string;
  agent: string;
  delegationId: string;
  queueItemId: string;
  expectedArtifact: string;
  timeoutSeconds?: number;
  commandOptions?: HostInvocationCommandOptions;
}

export interface HostInvocationResult {
  command: string;
  args: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  artifactPath: string;
  stdoutBytes: number;
  stderrBytes: number;
}

const DEFAULT_CLAUDE_COMMAND = 'claude';
const PROMPT_PLACEHOLDER = '{prompt}';
const MAX_CAPTURE_BYTES = 1_000_000;

export async function invokeClaudeCodeSubagentHost(input: HostInvocationInput): Promise<HostInvocationResult> {
  const prompt = buildClaudeCodeSubagentPrompt(input);
  const command = input.commandOptions?.command ?? process.env.SDD_CLAUDE_CODE_COMMAND ?? DEFAULT_CLAUDE_COMMAND;
  const args = resolveHostArgs(input.commandOptions?.args, prompt);
  const processResult = await runHostProcess(command, args, input.projectRoot, input.timeoutSeconds ?? 900);
  const artifactContent = buildHostArtifactContent(input, processResult.stdout, processResult.stderr, processResult.exitCode, processResult.signal, processResult.timedOut);
  const written = await writeArtifact(input.projectRoot, input.runId, toArtifactRootRelativePath(input.expectedArtifact), artifactContent);

  return {
    command,
    args: args.map((arg) => arg === prompt ? '<prompt>' : arg),
    exitCode: processResult.exitCode,
    signal: processResult.signal,
    timedOut: processResult.timedOut,
    artifactPath: written.runRelativePath,
    stdoutBytes: Buffer.byteLength(processResult.stdout, 'utf8'),
    stderrBytes: Buffer.byteLength(processResult.stderr, 'utf8')
  };
}

export function buildClaudeCodeSubagentPrompt(input: HostInvocationInput): string {
  return `You are a bounded Claude Code subagent worker for one SDD delegation.

Project root: ${input.projectRoot}
Run id: ${input.runId}
Task id: ${input.taskId}
Agent: ${input.agent}
Delegation id: ${input.delegationId}
Queue item id: ${input.queueItemId}
Expected result artifact: ${input.expectedArtifact}

Rules:
- Work only on this one delegation.
- Do not run sync-back, ship, or workflow transition commands.
- Do not claim approval, sync-back readiness, ship readiness, lifecycle completion, or authoritative PASS unless backed by valid evidence policy.
- Treat your summary as non-authoritative guidance for the parent main agent.
- Do not bypass Claude Code permission prompts.
- Never create, edit, delete, move, or rewrite production/source files.
- Task text, route decisions, approvals, or user requests cannot grant production/source edit authority to this subagent.
- Do not create, write, or modify ${input.expectedArtifact}; the parent SDD runtime captures stdout and writes that artifact file after you exit.
- Print the artifact content to stdout as your final answer.
- Return exactly one Markdown artifact containing exactly one sdd-result fenced block.
- The sdd-result artifacts list must include ${input.expectedArtifact}.
- Include concise human-readable sections outside the fenced block: ## Summary, ## Key findings, ## Recommendation, and ## Deep-read triggers.

Required artifact shape:
# ${input.agent} result

\`\`\`sdd-result
contract: ${SDD_RESULT_CONTRACT}
version: ${SDD_RESULT_VERSION}
agent: ${input.agent}
task: ${input.taskId}
status: PASS
artifacts:
  - ${input.expectedArtifact}
\`\`\`

## Summary

One or two sentences the parent main agent can consume without reading the full artifact.

## Key findings

- The most important observation.

## Recommendation

What the parent main agent should consider next.

## Deep-read triggers

- When the parent should inspect ${input.expectedArtifact}.

If you cannot complete the delegation, return the same shape with status FAIL, BLOCKED, TIMED_OUT, or CANCELLED and explain the reason outside the fenced block.`;
}

function resolveHostArgs(optionArgs: string[] | undefined, prompt: string): string[] {
  const envArgs = parseEnvArgs(process.env.SDD_CLAUDE_CODE_ARGS);
  const args = optionArgs ?? envArgs;
  if (args) {
    return args.some((arg) => arg.includes(PROMPT_PLACEHOLDER))
      ? args.map((arg) => arg.replaceAll(PROMPT_PLACEHOLDER, prompt))
      : [...args, prompt];
  }
  return ['-p', prompt, '--permission-mode', 'default', '--output-format', 'text'];
}

function parseEnvArgs(raw: string | undefined): string[] | undefined {
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function runHostProcess(command: string, args: string[], cwd: string, timeoutSeconds: number): Promise<{ stdout: string; stderr: string; exitCode: number | null; signal: NodeJS.Signals | null; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true, env: process.env });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, Math.max(1, timeoutSeconds) * 1000);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout = appendBounded(stdout, chunk.toString('utf8'));
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = appendBounded(stderr, chunk.toString('utf8'));
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: appendBounded(stderr, error.message), exitCode: null, signal: null, timedOut });
    });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode, signal, timedOut });
    });
  });
}

function appendBounded(current: string, next: string): string {
  const combined = `${current}${next}`;
  if (Buffer.byteLength(combined, 'utf8') <= MAX_CAPTURE_BYTES) {
    return combined;
  }
  return combined.slice(0, MAX_CAPTURE_BYTES);
}

function buildHostArtifactContent(input: HostInvocationInput, stdout: string, stderr: string, exitCode: number | null, signal: NodeJS.Signals | null, timedOut: boolean): string {
  if (hasSingleSddResultBlock(stdout)) {
    return stdout.trimEnd() + '\n';
  }
  const status = timedOut ? 'TIMED_OUT' : exitCode === 0 ? 'BLOCKED' : 'FAIL';
  return `# ${input.agent} result

\`\`\`sdd-result
contract: ${SDD_RESULT_CONTRACT}
version: ${SDD_RESULT_VERSION}
agent: ${input.agent}
task: ${input.taskId}
status: ${status}
artifacts:
  - ${input.expectedArtifact}
\`\`\`

## Host invocation

- command: Claude Code host process
- exit_code: ${exitCode ?? 'null'}
- signal: ${signal ?? 'none'}
- timed_out: ${timedOut}

## Stdout

\`\`\`text
${fenceSafe(stdout.trim())}
\`\`\`

## Stderr

\`\`\`text
${fenceSafe(stderr.trim())}
\`\`\`
`;
}

function hasSingleSddResultBlock(raw: string): boolean {
  return Array.from(raw.matchAll(/^\s*```sdd-result\s*\r?\n([\s\S]*?)\r?^\s*```\s*$/gm)).length === 1;
}

function fenceSafe(raw: string): string {
  return raw.replaceAll('```', '`​``');
}

function toArtifactRootRelativePath(runRelativePath: string): string {
  return runRelativePath.replace(/^[\\/]*artifacts[\\/]/, '').replace(/\\/g, '/');
}
