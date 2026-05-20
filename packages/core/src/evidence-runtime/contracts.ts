import type { RuntimeRef, RuntimeScope } from '../contracts.js';
import { TEST_EVIDENCE_RUN_CONTRACT_VERSION } from '../contracts.js';

export type TestEvidenceStatus = 'PASS' | 'FAIL' | 'BLOCKED';
export type EvidenceCoverageStatus = 'complete' | 'partial' | 'missing' | 'stale';

export interface TestCommandEvidence {
  command: string;
  status: TestEvidenceStatus;
  outputRef?: RuntimeRef;
  evidenceRefs: RuntimeRef[];
  acceptanceRefs: string[];
  startedAt: string;
  completedAt?: string;
}

export interface AcceptanceEvidenceCoverage {
  acceptanceRef: string;
  status: EvidenceCoverageStatus;
  evidenceRefs: RuntimeRef[];
  gaps: string[];
}

export interface UnifiedTestEvidenceRun {
  contract: typeof TEST_EVIDENCE_RUN_CONTRACT_VERSION;
  id: string;
  scope: RuntimeScope;
  commandStatus: TestEvidenceStatus;
  evidenceCoverage: EvidenceCoverageStatus;
  policyJudgment: TestEvidenceStatus;
  commands: TestCommandEvidence[];
  acceptanceCoverage: AcceptanceEvidenceCoverage[];
  syncBackReady: boolean;
  gaps: string[];
  next: string;
  generatedAt: string;
}
