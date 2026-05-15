import { readFile } from 'node:fs/promises';
import { QUERY_STATUS_CONTRACT_VERSION } from '../contracts.js';
import { parseProjectConfig } from '../config/project-config.js';
import { getProjectConfigPath } from '../runtime-paths.js';

export type QuerySurfaceId = 'status' | 'doctor' | 'run_inspect' | 'debug';

export interface QueryStatusSurface {
  id: QuerySurfaceId;
  command: string;
  responsibility: string;
  includes: string[];
  excludes: string[];
  nextActionRule: string;
}

export interface QueryStatusContract {
  version: typeof QUERY_STATUS_CONTRACT_VERSION;
  sourceDocument: string;
  surfaces: QueryStatusSurface[];
}

export interface ContractValidationIssue {
  field: string;
  message: string;
  recommendation: string;
}

export interface QueryStatusValidation {
  version: typeof QUERY_STATUS_CONTRACT_VERSION;
  valid: boolean;
  surfaces: QueryStatusSurface[];
  issues: ContractValidationIssue[];
}

const QUERY_STATUS_SURFACES: QueryStatusSurface[] = [
  {
    id: 'status',
    command: 'sdd status --branch <branch>',
    responsibility: 'Show current SDD route position and one recommended next action.',
    includes: ['branch/source context', 'document/task counts', 'blocking gaps', 'latest run summary', 'recommended next command'],
    excludes: ['full doctor audit', 'full event log', 'artifact body drill-down'],
    nextActionRule: 'Always end with the next command or maintenance action.'
  },
  {
    id: 'doctor',
    command: 'sdd doctor [--latest-only|--all-runs]',
    responsibility: 'Audit project health, generated entry drift, and run evidence consistency.',
    includes: ['config health', 'managed asset drift categories', 'run evidence health', 'contract visibility'],
    excludes: ['workflow next action selection', 'full artifact body dump'],
    nextActionRule: 'Return maintenance action only when a health check fails or warns.'
  },
  {
    id: 'run_inspect',
    command: 'sdd run inspect <run_id>',
    responsibility: 'Inspect one run as execution evidence.',
    includes: ['run state', 'recent events', 'artifacts', 'artifact ingestions', 'validation', 'sync-back proposal', 'task-run evidence'],
    excludes: ['project-wide health audit', 'branch route recommendation'],
    nextActionRule: 'Point to evidence inspection, verify, or sync-back based on run state.'
  },
  {
    id: 'debug',
    command: 'sdd run index inspect|query and focused inspect commands',
    responsibility: 'Provide drill-down views for maintainers without becoming the default user path.',
    includes: ['derived indexes', 'contract internals', 'focused diagnostics'],
    excludes: ['main route summary', 'automatic repair'],
    nextActionRule: 'Use only after status, doctor, or run inspect identifies a specific drill-down target.'
  }
];

export async function inspectQueryStatusContract(projectRoot: string): Promise<QueryStatusContract> {
  await assertProjectConfigReadable(projectRoot);
  return {
    version: QUERY_STATUS_CONTRACT_VERSION,
    sourceDocument: 'docs/architecture/command-information-architecture.md',
    surfaces: [...QUERY_STATUS_SURFACES]
  };
}

export async function validateQueryStatusContract(projectRoot: string): Promise<QueryStatusValidation> {
  const contract = await inspectQueryStatusContract(projectRoot);
  const issues = contract.surfaces.flatMap(validateQueryStatusSurface);
  return {
    version: QUERY_STATUS_CONTRACT_VERSION,
    valid: issues.length === 0,
    surfaces: contract.surfaces,
    issues
  };
}

function validateQueryStatusSurface(surface: QueryStatusSurface): ContractValidationIssue[] {
  const issues: ContractValidationIssue[] = [];
  if (surface.command.trim().length === 0) {
    issues.push(contractIssue(`${surface.id}.command`, 'Query surface has no command.', 'Declare the CLI command that owns this query responsibility.'));
  }
  if (surface.responsibility.trim().length === 0) {
    issues.push(contractIssue(`${surface.id}.responsibility`, 'Query surface has no responsibility boundary.', 'Declare what this query surface is responsible for.'));
  }
  if (surface.includes.length === 0) {
    issues.push(contractIssue(`${surface.id}.includes`, 'Query surface has no included evidence.', 'Declare what evidence this surface must include.'));
  }
  if (surface.excludes.length === 0) {
    issues.push(contractIssue(`${surface.id}.excludes`, 'Query surface has no exclusion boundary.', 'Declare what belongs to a different query surface.'));
  }
  if (surface.nextActionRule.trim().length === 0) {
    issues.push(contractIssue(`${surface.id}.nextActionRule`, 'Query surface has no next-action rule.', 'Declare how this surface should route the user after inspection.'));
  }
  return issues;
}

function contractIssue(field: string, message: string, recommendation: string): ContractValidationIssue {
  return { field, message, recommendation };
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}
