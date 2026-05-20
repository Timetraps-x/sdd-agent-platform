import { checkAiToolEntryDrift } from '../../ai-tools.js';
import type { DoctorCheck } from '../model.js';

export async function inspectAiToolEntryEvidence(projectRoot: string): Promise<DoctorCheck[]> {
  const results = await checkAiToolEntryDrift(projectRoot);
  const checks = results.flatMap((result) => result.entries.map((entry): DoctorCheck => {
    const check = `ai_entry_${entry.id}`;
    const message = `${entry.relativePath}: ${entry.message}`;
    if (entry.status === 'unchanged') {
      return { level: 'PASS', check, message };
    }
    if (entry.status === 'missing' || entry.status === 'drifted') {
      return { level: 'FAIL', check, message, action: entry.action ?? 'Run sdd update.' };
    }
    if (entry.status === 'user-modified') {
      return { level: 'FAIL', check, message, action: entry.action ?? 'Review manually; sdd update will not overwrite user-modified entries by default.' };
    }
    if (entry.status === 'foreign' || entry.status === 'conflict') {
      return { level: 'FAIL', check, message, action: entry.action ?? 'Review the target file before running sdd update.' };
    }
    return { level: 'WARN', check, message, action: entry.action };
  }));

  if (checks.length === 0) {
    checks.push({ level: 'WARN', check: 'ai_entries', message: 'No AI tool adapters selected for drift inspection.', action: 'Run sdd init --ai claude-code if Claude Code entries are required.' });
  }
  return checks;
}
