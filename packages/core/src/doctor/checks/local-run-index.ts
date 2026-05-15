import { inspectLocalRunIndex } from '../../run-state/run-index.js';
import type { DoctorCheck } from '../model.js';

export async function inspectLocalRunIndexEvidence(projectRoot: string): Promise<DoctorCheck[]> {
  const inspection = await inspectLocalRunIndex(projectRoot);
  if (!inspection.exists) {
    return [{
      level: 'WARN',
      check: 'local_run_index',
      message: 'Local run index is missing; .sdd/runs remains the source of truth.',
      action: 'Run sdd run index rebuild to create the derived index.'
    }];
  }
  if (!inspection.valid) {
    return inspection.issues.map((issue) => ({
      level: 'WARN' as const,
      check: 'local_run_index',
      message: issue.message,
      action: issue.recommendation
    }));
  }
  return [{
    level: 'PASS',
    check: 'local_run_index',
    message: `Local run index is current with ${inspection.index?.runs.length ?? 0} run(s), ${inspection.index?.delegations.length ?? 0} delegation(s), and ${inspection.index?.artifacts.length ?? 0} artifact(s).`
  }];
}
