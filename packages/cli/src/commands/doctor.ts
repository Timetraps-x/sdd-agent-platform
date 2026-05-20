import { doctor } from '@sdd-agent-platform/core/doctor';
import { renderDoctorReport } from '../renderers/doctor.js';
import { readBranchOption } from '../args.js';
import { jsonOutput, wantsJson } from '../renderers/json.js';

export interface CliResult {
  exitCode: number;
  output?: string;
  error?: string;
}

export async function handleDoctorCommand(projectRoot: string, command: string | undefined, subcommand: string | undefined, rest: string[]): Promise<CliResult | null> {
  if (command !== 'doctor') {
    return null;
  }

  const doctorArgs = [subcommand, ...rest].filter((item): item is string => Boolean(item));
  const fast = doctorArgs.includes('fast') || doctorArgs.includes('--latest-only');
  const deep = doctorArgs.includes('deep') || doctorArgs.includes('--all-runs');
  if (fast && deep) {
    return {
      exitCode: 2,
      error: 'Usage: sdd doctor [fast|deep] [--latest-only] [--all-runs] [--branch <branch>] (choose only one scope)'
    };
  }
  const report = await doctor(projectRoot, {
    latestOnly: fast || !deep,
    allRuns: deep,
    branch: readBranchOption(doctorArgs)
  });
  const json = wantsJson(doctorArgs);
  return {
    exitCode: report.status === 'FAIL' ? 1 : 0,
    output: json ? jsonOutput(report, doctorArgs) : renderDoctorReport(report, { mode: deep ? 'deep' : 'fast', recover: doctorArgs.includes('recover') })
  };
}
