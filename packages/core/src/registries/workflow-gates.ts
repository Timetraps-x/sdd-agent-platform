import { readFile } from 'node:fs/promises';
import { WORKFLOW_GATE_CONTRACT_VERSION } from '../contracts.js';
import { parseProjectConfig } from '../config/project-config.js';
import { getProjectConfigPath } from '../runtime-paths.js';

export type WorkflowGateId = 'spec' | 'plan' | 'tasks' | 'do' | 'verify' | 'doctor';

export interface WorkflowGateContract {
  version: typeof WORKFLOW_GATE_CONTRACT_VERSION;
  id: WorkflowGateId;
  command: string;
  requiredInputs: string[];
  allowedAgents: string[];
  requiredArtifacts: string[];
  gateConditions: string[];
  gapClosureBehavior: string;
  nextAction: string;
}

export interface WorkflowGateRegistry {
  version: typeof WORKFLOW_GATE_CONTRACT_VERSION;
  workflows: WorkflowGateContract[];
}

const BUILT_IN_WORKFLOW_GATES: WorkflowGateContract[] = [
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'spec',
    command: 'sdd instructions spec --json',
    requiredInputs: ['user intent or revision request', 'existing specs/<branch>/spec.md when present'],
    allowedAgents: ['scout', 'spec-reviewer'],
    requiredArtifacts: ['specs/<branch>/spec.md', 'spec checkpoint notes'],
    gateConditions: ['explicit scope', 'verifiable acceptance', 'open questions listed'],
    gapClosureBehavior: 'Stop at spec gaps; do not advance to plan until scope and acceptance are explicit.',
    nextAction: 'Run lifecycle gate when risk is unclear, then refine specs/<branch>/spec.md.'
  },
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'plan',
    command: 'sdd instructions plan --json',
    requiredInputs: ['approved spec', 'impact/risk context', 'architecture context', 'validation constraints'],
    allowedAgents: ['scout', 'planner', 'spec-reviewer'],
    requiredArtifacts: ['specs/<branch>/plan.md'],
    gateConditions: ['technical solution selected', 'current and target state described', 'risk-driven design sections completed', 'validation matrix defined', 'task breakdown rationale stated'],
    gapClosureBehavior: 'Return to spec or research when plan inputs, architecture context, risk controls, or validation evidence are ambiguous.',
    nextAction: 'Refine specs/<branch>/plan.md as the technical solution document and stop before task writing if plan gaps remain.'
  },
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'tasks',
    command: 'sdd instructions tasks --json',
    requiredInputs: ['approved spec', 'approved plan', 'task boundary candidates'],
    allowedAgents: ['planner', 'reviewer'],
    requiredArtifacts: ['specs/<branch>/tasks.md'],
    gateConditions: ['each task has boundary', 'affected files declared when knowable', 'validation declared'],
    gapClosureBehavior: 'Run sdd tasks gaps and fix blocking task metadata before implementation.',
    nextAction: 'Create executable sdd-task blocks, then run sdd tasks gaps --branch <branch>.'
  },
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'do',
    command: 'sdd do task <task_id>',
    requiredInputs: ['selected task', 'boundary', 'acceptance', 'declared validation'],
    allowedAgents: ['scout', 'implementer', 'reviewer', 'debugger', 'validator'],
    requiredArtifacts: ['artifacts/implement-<task>.md', 'artifacts/review-<task>.md', 'artifacts/validation-<task>.md'],
    gateConditions: ['single selected task', 'no blocking task gaps', 'artifact template available'],
    gapClosureBehavior: 'Block on missing boundary, missing validation, invalid artifact, or expanded scope.',
    nextAction: 'Run inside the selected task boundary and record sdd-result artifacts before verify.'
  },
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'verify',
    command: 'sdd verify task <task_id> [--run <run_id>]',
    requiredInputs: ['task id', 'review evidence', 'validation evidence'],
    allowedAgents: ['validator', 'reviewer'],
    requiredArtifacts: ['artifacts/validation-<task>.md', 'sync-back proposal when PASS'],
    gateConditions: ['acceptance mapped to evidence', 'validation gaps explicit', 'sync-back policy known'],
    gapClosureBehavior: 'Return PASS_WITH_GAPS, FAIL, or BLOCKED when acceptance evidence is incomplete.',
    nextAction: 'Inspect sync-back proposal after PASS and follow apply_policy.'
  },
  {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    id: 'doctor',
    command: 'sdd doctor',
    requiredInputs: ['project config', 'managed AI entries', 'run evidence'],
    allowedAgents: ['scout'],
    requiredArtifacts: ['doctor report'],
    gateConditions: ['config readable', 'managed entries current', 'run evidence consistent'],
    gapClosureBehavior: 'Report maintenance action instead of mutating source files automatically.',
    nextAction: 'Run the recommended maintenance command or return to status when healthy.'
  }
];

export async function listWorkflowGates(projectRoot: string): Promise<WorkflowGateRegistry> {
  await assertProjectConfigReadable(projectRoot);
  return {
    version: WORKFLOW_GATE_CONTRACT_VERSION,
    workflows: [...BUILT_IN_WORKFLOW_GATES].sort((left, right) => left.id.localeCompare(right.id))
  };
}

export async function inspectWorkflowGate(projectRoot: string, workflowId: string): Promise<WorkflowGateContract | null> {
  const registry = await listWorkflowGates(projectRoot);
  return registry.workflows.find((workflow) => workflow.id === workflowId) ?? null;
}

async function assertProjectConfigReadable(projectRoot: string): Promise<void> {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  parseProjectConfig(raw, configPath);
}
