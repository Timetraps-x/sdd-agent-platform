import { execFile } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type CliRunResult = Awaited<ReturnType<typeof execFileAsync>>;

export async function runCli(root: string, args: string[]): Promise<CliRunResult> {
  const cliPath = path.join(process.cwd(), 'packages/cli/src/main.ts');
  const tsxLoader = pathToFileURL(path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs')).href;
  return execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, ...args], { cwd: root });
}

export async function runCliJson<T>(root: string, args: string[]): Promise<T> {
  const result = await runCli(root, args);
  return JSON.parse(String(result.stdout)) as T;
}
