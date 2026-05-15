import { LIFECYCLE_RISK_GATE_CONTRACT_VERSION } from '../contracts.js';

export type SignalClarity = 'high' | 'medium' | 'low';
export type EstimatedChangeSize = 'tiny' | 'small' | 'medium' | 'large';
export type ImpactConfidence = 'high' | 'medium' | 'low';
export type ValidationClarity = 'clear' | 'partial' | 'unclear';
export type OrchestrationUncertainty = 'low' | 'medium' | 'high';
export type Reversibility = 'reversible' | 'irreversible' | 'unknown';
export type LifecycleRiskCategory = 'state_machine' | 'concurrency' | 'database_data_loss' | 'security' | 'sql' | 'api_schema' | 'ci_build' | 'external_unknown';
export type LifecycleRiskExtractionSource = 'from_text' | 'from_file' | 'none';

export interface LifecycleRiskExtractionEvidence {
  category: LifecycleRiskCategory;
  matched: string;
  riskTag: string;
}

export interface LifecycleDecisionSignals {
  intent_clarity: SignalClarity;
  acceptance_clarity: SignalClarity;
  estimated_change_size: EstimatedChangeSize;
  task_count_estimate: number;
  file_count_estimate: number;
  affected_layers: string[];
  affected_contracts: string[];
  dependency_fanout: 'none' | 'local' | 'multi_component' | 'unknown';
  impact_confidence: ImpactConfidence;
  risk_tags: string[];
  reversibility: Reversibility;
  validation_clarity: ValidationClarity;
  validation_available: boolean;
  validation_cost: 'cheap' | 'moderate' | 'expensive' | 'unknown';
  policy_hits: string[];
  permission_required: string[];
  requires_agents: boolean;
  handoff_count: number;
  artifact_dependency: boolean;
  runtime_recovery_need: boolean;
  orchestration_uncertainty: OrchestrationUncertainty;
  human_checkpoint_required: boolean;
  approval_reason: string[];
  source_artifacts: string[];
  can_scout_impact: boolean;
  architecture_decision_required: boolean;
  external_unknown: boolean;
}

export interface LifecycleRiskGateExtraction {
  contract: typeof LIFECYCLE_RISK_GATE_CONTRACT_VERSION;
  source: LifecycleRiskExtractionSource;
  riskTags: string[];
  affectedContracts: string[];
  externalUnknown: boolean;
  architectureDecisionRequired: boolean;
  reversibility?: Reversibility;
  validationClarity?: ValidationClarity;
  impactConfidence?: ImpactConfidence;
  evidence: LifecycleRiskExtractionEvidence[];
  signals: Partial<LifecycleDecisionSignals>;
}

export function extractLifecycleRiskSignalsFromText(text: string, source: LifecycleRiskExtractionSource = 'from_text'): LifecycleRiskGateExtraction {
  const evidence: LifecycleRiskExtractionEvidence[] = [];
  const riskTags: string[] = [];
  const affectedContracts: string[] = [];
  let externalUnknown = false;
  let architectureDecisionRequired = false;
  let reversibility: Reversibility | undefined;
  let validationClarity: ValidationClarity | undefined;
  let impactConfidence: ImpactConfidence | undefined;

  function addEvidence(category: LifecycleRiskCategory, matched: string, riskTag: string): void {
    evidence.push({ category, matched, riskTag });
    riskTags.push(riskTag);
  }

  function collect(category: LifecycleRiskCategory, terms: string[], riskTag: string): void {
    for (const term of terms) {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        addEvidence(category, term, riskTag);
      }
    }
  }

  collect('state_machine', ['state machine', 'state-machine', 'state_machine', '状态机', '状态流转', '状态转换', 'liveness', 'recovery'], 'state-machine');
  collect('concurrency', ['concurrency', 'parallel', 'race', 'thread', 'multi-thread', '并发', '线程', '竞态', '锁'], 'concurrency');
  collect('database_data_loss', ['database', 'migration', 'consistency', '数据一致性', '数据库', '迁移'], 'database');
  collect('database_data_loss', ['data loss', 'data-loss', '数据丢失', '不可逆', 'irreversible'], 'data_loss');
  collect('sql', ['sql', 'SQL', 'SQL 拼接', '拼接 SQL'], 'database');
  collect('security', ['security', 'auth', 'permission', 'credential', 'token', 'secret', 'privacy', '安全', '认证', '授权', '凭证', '隐私'], 'security');
  collect('security', ['SQL injection', 'sql injection', '注入'], 'security');
  collect('api_schema', ['api', 'schema', 'contract', 'openapi', '接口', '契约', '协议', '字段', '兼容'], 'api');
  collect('ci_build', ['ci', 'cd', 'build', 'release', 'publish', 'dependency', 'pipeline', '构建', '发布', '依赖', '流水线'], 'build');
  collect('external_unknown', ['external', 'third-party', 'unknown', 'unscoutable', '外部', '第三方', '未知', '不确定'], 'external_unknown');

  if (evidence.some((item) => item.category === 'api_schema')) {
    affectedContracts.push('api_schema');
  }
  if (evidence.some((item) => item.category === 'external_unknown')) {
    externalUnknown = true;
    impactConfidence = 'low';
  }
  if (evidence.some((item) => item.category === 'database_data_loss' && (item.riskTag === 'data_loss' || item.matched.toLowerCase().includes('irreversible') || item.matched.includes('不可逆')))) {
    reversibility = 'irreversible';
  }
  if (evidence.some((item) => item.category === 'ci_build')) {
    validationClarity = 'partial';
  }
  if (text.includes('架构') || text.toLowerCase().includes('architecture decision')) {
    architectureDecisionRequired = true;
  }

  const signals: Partial<LifecycleDecisionSignals> = {
    risk_tags: uniqueStrings(riskTags),
    affected_contracts: uniqueStrings(affectedContracts),
    external_unknown: externalUnknown,
    architecture_decision_required: architectureDecisionRequired
  };
  if (reversibility) {
    signals.reversibility = reversibility;
  }
  if (validationClarity) {
    signals.validation_clarity = validationClarity;
  }
  if (impactConfidence) {
    signals.impact_confidence = impactConfidence;
  }

  return {
    contract: LIFECYCLE_RISK_GATE_CONTRACT_VERSION,
    source,
    riskTags: uniqueStrings(riskTags),
    affectedContracts: uniqueStrings(affectedContracts),
    externalUnknown,
    architectureDecisionRequired,
    reversibility,
    validationClarity,
    impactConfidence,
    evidence,
    signals
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}
