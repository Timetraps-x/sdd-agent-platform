import path from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  HARNESS_LEARNING_CONTRACT_VERSION,
  PROJECT_CONTEXT_PACK_CONTRACT_VERSION,
  SKILL_AGENT_EVAL_CONTRACT_VERSION
} from '../contracts.js';
import { parseProjectConfig } from '../config/project-config.js';
import { getProjectConfigPath } from '../runtime-paths.js';
import { exists } from '../storage/json-io.js';

export interface ContractValidationIssue {
  field: string;
  message: string;
  recommendation: string;
}

export type SkillAgentEvalDimensionId = 'novel_judgment' | 'risk_identification' | 'task_slicing' | 'agent_evidence' | 'output_concision' | 'verification_executability' | 'autonomy_correctness' | 'agent_fit' | 'verification_availability' | 'gap_closure';

export interface SkillAgentEvalDimension {
  id: SkillAgentEvalDimensionId;
  expectation: string;
  baselineFinding: string;
  passThreshold: number;
}

export interface SkillAgentEvalContract {
  version: typeof SKILL_AGENT_EVAL_CONTRACT_VERSION;
  corpus: string[];
  sourceReport: string;
  dimensions: SkillAgentEvalDimension[];
  regressionAssertions: string[];
}

export interface SkillAgentEvalValidation {
  version: typeof SKILL_AGENT_EVAL_CONTRACT_VERSION;
  valid: boolean;
  contract: SkillAgentEvalContract;
  issues: ContractValidationIssue[];
}

export type HarnessLearningSinkId = 'project_context_pack' | 'risk_vocabulary' | 'checklist' | 'doctor_check' | 'eval_assertion' | 'generated_entry_guidance';

export interface HarnessLearningSink {
  id: HarnessLearningSinkId;
  output: string;
  boundary: string;
}

export interface HarnessLearningContract {
  version: typeof HARNESS_LEARNING_CONTRACT_VERSION;
  sourceTrial: string;
  allowedSinks: HarnessLearningSink[];
  forbiddenOutputs: string[];
  promotionRule: string;
}

export interface HarnessLearningValidation {
  version: typeof HARNESS_LEARNING_CONTRACT_VERSION;
  valid: boolean;
  contract: HarnessLearningContract;
  issues: ContractValidationIssue[];
}

export interface ProjectContextPackContract {
  version: typeof PROJECT_CONTEXT_PACK_CONTRACT_VERSION;
  entryPoint: string;
  durableContext: string[];
  runtimeSourcesOfTruth: string[];
  boundaries: string[];
}

export interface ProjectContextPackValidation {
  version: typeof PROJECT_CONTEXT_PACK_CONTRACT_VERSION;
  valid: boolean;
  contract: ProjectContextPackContract;
  issues: ContractValidationIssue[];
}

const SKILL_AGENT_EVAL_CORPUS = [
  'docs/research/real-project-trial-evaluation-20260507.md'
];

const SKILL_AGENT_EVAL_DIMENSIONS: SkillAgentEvalDimension[] = [
  { id: 'novel_judgment', expectation: 'Evaluator identifies what SDD added beyond restating the source requirement.', baselineFinding: 'ERP trial mostly normalized source text and missed independent state-machine judgment.', passThreshold: 7 },
  { id: 'risk_identification', expectation: 'State-machine, concurrency, database, SQL, API/schema, CI/build, and external unknown risks are extracted without relying on manual flags.', baselineFinding: 'ERP state-flow and concurrency hard gates were downgraded to compact before Phase 5.1 risk extraction.', passThreshold: 8 },
  { id: 'task_slicing', expectation: 'Large state-flow fixes split into reviewable slices while preserving file-overlap and serial execution constraints.', baselineFinding: 'ERP trial compressed four risk boundaries into one task, limiting review and validation visibility.', passThreshold: 7 },
  { id: 'agent_evidence', expectation: 'Scout, planner, reviewer, debugger, or validator participation is visible through bounded artifacts or explicit non-use rationale.', baselineFinding: 'ERP trial did not show visible agent artifacts or role-specific evidence.', passThreshold: 7 },
  { id: 'output_concision', expectation: 'User-visible output is delta-first, evidence-backed, and avoids repeated status boilerplate.', baselineFinding: 'ERP trial repeated branch/status/next-step boilerplate and obscured useful deltas.', passThreshold: 7 },
  { id: 'verification_executability', expectation: 'Validation commands and acceptance checks are executable or state why they cannot run.', baselineFinding: 'ERP trial listed Maven compile but did not map each state-flow acceptance item to executable evidence.', passThreshold: 8 },
  { id: 'autonomy_correctness', expectation: 'Autonomy ceiling matches hard gates, shared-state risk, and confirmation requirements.', baselineFinding: 'ERP trial treated high-risk state/concurrency work as compact instead of full.', passThreshold: 8 },
  { id: 'agent_fit', expectation: 'Task metadata names which agent roles fit each slice and when they must stop.', baselineFinding: 'ERP trial task metadata had no agent-fit evidence despite role registry availability.', passThreshold: 7 },
  { id: 'verification_availability', expectation: 'Task metadata records unit, build, CLI, manual, or unavailable verification sources.', baselineFinding: 'ERP trial had one compile command but no per-slice verification availability.', passThreshold: 7 },
  { id: 'gap_closure', expectation: 'Blocking gaps route to checklist, eval assertion, doctor check, or generated-entry guidance instead of silent completion.', baselineFinding: 'ERP trial surfaced few actionable gap-closure paths beyond generic next commands.', passThreshold: 7 }
];

const HARNESS_LEARNING_SINKS: HarnessLearningSink[] = [
  { id: 'project_context_pack', output: 'Durable project collaboration and positioning context.', boundary: 'May summarize stable strategy, but must not duplicate live specs, runs, task status, or generated command content.' },
  { id: 'risk_vocabulary', output: 'Keywords and mappings for lifecycle risk extraction.', boundary: 'May add deterministic vocabulary; must not bypass lifecycle hard gates or user confirmation.' },
  { id: 'checklist', output: 'Human-reviewable checklist for recurring failure classes.', boundary: 'May guide future runs; must not claim validation without runtime evidence.' },
  { id: 'doctor_check', output: 'A new explicit health/audit check.', boundary: 'May inspect facts; must not auto-repair or mutate project state.' },
  { id: 'eval_assertion', output: 'Regression assertion against a known trial failure.', boundary: 'May fail tests or eval; must not silently rewrite runtime behavior.' },
  { id: 'generated_entry_guidance', output: 'Managed command or skill wording update.', boundary: 'Must remain sdd-managed and refresh through update rather than user-file overwrite.' }
];

const HARNESS_LEARNING_FORBIDDEN_OUTPUTS = ['self-modifying runtime', 'hidden background automation', 'unapproved sync-back apply', 'replacement of .sdd/project.yml/specs/runs/artifacts as source of truth'];

const PROJECT_CONTEXT_PACK: ProjectContextPackContract = {
  version: PROJECT_CONTEXT_PACK_CONTRACT_VERSION,
  entryPoint: 'context/memory/MEMORY.md',
  durableContext: [
    'stable product positioning and phase direction',
    'collaboration preferences that affect future SDD work',
    'external reference pointers that remain useful across sessions'
  ],
  runtimeSourcesOfTruth: [
    '.sdd/project.yml for project configuration',
    'specs/<branch>/spec.md, plan.md, and tasks.md for semantic state',
    '.sdd/runs/<run_id>/state.json and events.jsonl for runtime execution facts',
    '.sdd/runs/<run_id>/artifacts/*.md for agent and validation evidence'
  ],
  boundaries: [
    'Context pack may prime future sessions but cannot mark tasks complete.',
    'Context pack may describe repeated failures but cannot replace eval assertions or doctor checks.',
    'Context pack must be verified against current files before acting on file, function, or flag claims.'
  ]
};

export async function inspectSkillAgentEvalContract(projectRoot: string): Promise<SkillAgentEvalContract> {
  await readProjectConfig(projectRoot);
  return {
    version: SKILL_AGENT_EVAL_CONTRACT_VERSION,
    corpus: [...SKILL_AGENT_EVAL_CORPUS],
    sourceReport: 'docs/research/real-project-trial-evaluation-20260507.md',
    dimensions: [...SKILL_AGENT_EVAL_DIMENSIONS],
    regressionAssertions: [
      'ERP state-flow/concurrency work must not route to compact when risk evidence is present.',
      'Generated tasks must expose agent_fit and verification_availability when agent registry and task graph metadata exist.',
      'Output should state evidence deltas before repeating route/status boilerplate.'
    ]
  };
}

export async function validateSkillAgentEvalContract(projectRoot: string): Promise<SkillAgentEvalValidation> {
  const contract = await inspectSkillAgentEvalContract(projectRoot);
  const issues: ContractValidationIssue[] = [];
  if (await shouldValidatePlatformTrialCorpus(projectRoot)) {
    for (const corpusPath of [...contract.corpus, contract.sourceReport]) {
      if (!await exists(path.join(projectRoot, corpusPath))) {
        issues.push(contractIssue('skillAgentEval.corpus', `Eval source is missing: ${corpusPath}.`, 'Restore the ERP trial corpus before treating Phase 5.5 eval as repeatable.'));
      }
    }
  }
  const requiredDimensions: SkillAgentEvalDimensionId[] = ['novel_judgment', 'risk_identification', 'task_slicing', 'agent_evidence', 'output_concision', 'verification_executability', 'autonomy_correctness', 'agent_fit', 'verification_availability', 'gap_closure'];
  for (const dimension of requiredDimensions) {
    if (!contract.dimensions.some((candidate) => candidate.id === dimension)) {
      issues.push(contractIssue('skillAgentEval.dimensions', `Missing eval dimension: ${dimension}.`, 'Add the missing Phase 5.5 eval dimension.'));
    }
  }
  for (const dimension of contract.dimensions) {
    if (dimension.passThreshold < 1 || dimension.passThreshold > 10) {
      issues.push(contractIssue(`${dimension.id}.passThreshold`, 'Eval pass threshold must be a 1-10 score.', 'Use a bounded 1-10 threshold.'));
    }
  }
  if (contract.regressionAssertions.length === 0) {
    issues.push(contractIssue('skillAgentEval.regressionAssertions', 'Eval contract has no regression assertions.', 'Add assertions for known ERP trial failures.'));
  }
  return { version: SKILL_AGENT_EVAL_CONTRACT_VERSION, valid: issues.length === 0, contract, issues };
}

export async function inspectHarnessLearningContract(projectRoot: string): Promise<HarnessLearningContract> {
  await readProjectConfig(projectRoot);
  return {
    version: HARNESS_LEARNING_CONTRACT_VERSION,
    sourceTrial: 'docs/research/real-project-trial-evaluation-20260507.md',
    allowedSinks: [...HARNESS_LEARNING_SINKS],
    forbiddenOutputs: [...HARNESS_LEARNING_FORBIDDEN_OUTPUTS],
    promotionRule: 'Repeated failures may become durable guidance only through reviewed context-pack, vocabulary, checklist, doctor, eval, or managed-entry changes.'
  };
}

export async function validateHarnessLearningContract(projectRoot: string): Promise<HarnessLearningValidation> {
  const contract = await inspectHarnessLearningContract(projectRoot);
  const issues: ContractValidationIssue[] = [];
  const requiredSinks: HarnessLearningSinkId[] = ['project_context_pack', 'risk_vocabulary', 'checklist', 'doctor_check', 'eval_assertion', 'generated_entry_guidance'];
  if (await shouldValidatePlatformTrialCorpus(projectRoot) && !await exists(path.join(projectRoot, contract.sourceTrial))) {
    issues.push(contractIssue('harnessLearning.sourceTrial', `Learning source is missing: ${contract.sourceTrial}.`, 'Restore the trial evaluation report before promoting learning outputs.'));
  }
  for (const sink of requiredSinks) {
    if (!contract.allowedSinks.some((candidate) => candidate.id === sink)) {
      issues.push(contractIssue('harnessLearning.allowedSinks', `Missing learning sink: ${sink}.`, 'Add the missing allowed learning sink.'));
    }
  }
  if (!contract.forbiddenOutputs.includes('self-modifying runtime')) {
    issues.push(contractIssue('harnessLearning.forbiddenOutputs', 'Learning contract does not forbid self-modifying runtime.', 'Declare self-modifying runtime out of scope.'));
  }
  return { version: HARNESS_LEARNING_CONTRACT_VERSION, valid: issues.length === 0, contract, issues };
}

export async function inspectProjectContextPackContract(projectRoot: string): Promise<ProjectContextPackContract> {
  await readProjectConfig(projectRoot);
  return {
    ...PROJECT_CONTEXT_PACK,
    durableContext: [...PROJECT_CONTEXT_PACK.durableContext],
    runtimeSourcesOfTruth: [...PROJECT_CONTEXT_PACK.runtimeSourcesOfTruth],
    boundaries: [...PROJECT_CONTEXT_PACK.boundaries]
  };
}

export async function validateProjectContextPackContract(projectRoot: string): Promise<ProjectContextPackValidation> {
  const contract = await inspectProjectContextPackContract(projectRoot);
  const issues: ContractValidationIssue[] = [];
  if (await shouldValidatePlatformProjectAssets(projectRoot) && !await exists(path.join(projectRoot, contract.entryPoint))) {
    issues.push(contractIssue('projectContextPack.entryPoint', `Context pack entry point is missing: ${contract.entryPoint}.`, 'Restore context/memory/MEMORY.md or update the context pack entry point.'));
  }
  if (!contract.runtimeSourcesOfTruth.some((source) => source.includes('.sdd/project.yml')) || !contract.runtimeSourcesOfTruth.some((source) => source.includes('specs/<branch>')) || !contract.runtimeSourcesOfTruth.some((source) => source.includes('.sdd/runs'))) {
    issues.push(contractIssue('projectContextPack.runtimeSourcesOfTruth', 'Context pack does not name the structured runtime sources of truth.', 'Declare .sdd/project.yml, specs/<branch>, and .sdd/runs as runtime sources of truth.'));
  }
  if (!contract.boundaries.some((boundary) => boundary.includes('cannot mark tasks complete'))) {
    issues.push(contractIssue('projectContextPack.boundaries', 'Context pack boundary does not prevent runtime state mutation.', 'Declare that context memory cannot mark tasks complete or replace runtime evidence.'));
  }
  return { version: PROJECT_CONTEXT_PACK_CONTRACT_VERSION, valid: issues.length === 0, contract, issues };
}

async function shouldValidatePlatformTrialCorpus(projectRoot: string): Promise<boolean> {
  return shouldValidatePlatformProjectAssets(projectRoot);
}

async function shouldValidatePlatformProjectAssets(projectRoot: string): Promise<boolean> {
  try {
    const config = await readProjectConfig(projectRoot);
    return config.project.name === 'sdd-agent-platform';
  } catch {
    return false;
  }
}

function contractIssue(field: string, message: string, recommendation: string): ContractValidationIssue {
  return { field, message, recommendation };
}

async function readProjectConfig(projectRoot: string) {
  const configPath = getProjectConfigPath(projectRoot);
  const raw = await readFile(configPath, 'utf8');
  return parseProjectConfig(raw, configPath);
}
