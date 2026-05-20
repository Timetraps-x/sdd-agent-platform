import type { RuntimeConfidence, RuntimeRef, RuntimeScope } from '../contracts.js';
import { CODING_FACT_SET_CONTRACT_VERSION } from '../contracts.js';

export type CodingFactKind = 'document' | 'task' | 'file' | 'test' | 'runtime' | 'evidence' | 'external';
export type CodingFileFactClass = 'spec-doc' | 'runtime-state' | 'cli-source' | 'core-source' | 'test-source' | 'generated-ai-entry' | 'release-doc' | 'unknown';

export interface CodingFact<TValue = unknown> {
  id: string;
  kind: CodingFactKind;
  source: string;
  scope: RuntimeScope;
  confidence: RuntimeConfidence;
  observedAt: string;
  inputHash?: string;
  refs: RuntimeRef[];
  reasons: string[];
  value: TValue;
}

export interface CodingFileFact {
  path: string;
  fileClass: CodingFileFactClass;
  changed: boolean;
  publicApi: boolean;
  generated: boolean;
  reasons: string[];
}

export interface CodingTestFact {
  command: string;
  acceptanceRefs: string[];
  required: boolean;
  sourceRefs: RuntimeRef[];
}

export interface CodingRuntimeFact {
  name: string;
  status: 'present' | 'missing' | 'stale' | 'failed' | 'unknown';
  refs: RuntimeRef[];
  reasons: string[];
}

export interface CodingEvidenceFact {
  acceptanceRef: string;
  evidenceRefs: RuntimeRef[];
  status: 'present' | 'missing' | 'stale' | 'failed';
  reasons: string[];
}

export interface CodingExternalFact {
  name: string;
  known: boolean;
  confidence: RuntimeConfidence;
  refs: RuntimeRef[];
  reasons: string[];
}

export interface CodingFactSet {
  contract: typeof CODING_FACT_SET_CONTRACT_VERSION;
  scope: RuntimeScope;
  request: {
    intentKnown: boolean;
    acceptanceKnown: boolean;
    validationKnown: boolean;
  };
  documents: {
    specExists: boolean;
    planExists: boolean;
    tasksExists: boolean;
    verifiesExists: boolean;
  };
  facts: CodingFact[];
  files: CodingFileFact[];
  tests: CodingTestFact[];
  runtime: CodingRuntimeFact[];
  evidence: CodingEvidenceFact[];
  external: CodingExternalFact[];
  generatedAt: string;
}
