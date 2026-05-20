export type TaskRiskLevel = 'low' | 'medium' | 'high';

export type TaskFileClass = 'spec-doc' | 'runtime-state' | 'cli-source' | 'core-source' | 'test-source' | 'api-schema' | 'generated-ai-entry' | 'release-doc' | 'unknown';

export interface TaskRiskProfile {
  contract: 'sdd-task-risk-profile-v1';
  taskId: string | null;
  riskLevel: TaskRiskLevel;
  rawTags: string[];
  normalizedTags: string[];
  fileClasses: TaskFileClass[];
  sourceBoundary: boolean;
  runtimeStateBoundary: boolean;
  docsOnly: boolean;
  validationOnly: boolean;
  securitySensitive: boolean;
  externalUnknown: boolean;
  externalKnown: boolean;
  contextRisk: boolean;
  tokenRisk: boolean;
  performanceRisk: boolean;
  teamRecommendation: 'none' | 'review-lite' | 'team-required';
  approvalRecommendation: 'direct' | 'review' | 'human-checkpoint';
  reasons: string[];
}

export interface TaskRiskProfileInput {
  id?: string | null;
  risk?: string[];
  affectedFiles?: string[];
  validation?: string[];
  requiredArtifacts?: string[];
}

export function buildTaskRiskProfile(task: TaskRiskProfileInput | null | undefined): TaskRiskProfile {
  const rawTags = task?.risk ?? [];
  const fileClasses = [...new Set((task?.affectedFiles ?? []).map(classifyTaskFile))].sort();
  const fileDerivedTags = fileClasses.includes('api-schema') ? ['api-schema'] : [];
  const normalizedTags = [...new Set([...rawTags.map(normalizeRiskTag).filter(Boolean), ...fileDerivedTags])].sort();
  const sourceBoundary = fileClasses.includes('cli-source') || fileClasses.includes('core-source');
  const runtimeStateBoundary = fileClasses.includes('runtime-state');
  const docsOnly = fileClasses.length > 0 && fileClasses.every((fileClass) => fileClass === 'spec-doc' || fileClass === 'release-doc');
  const validationOnly = normalizedTags.includes('validation-only') || (task?.validation?.length ?? 0) > 0 && !sourceBoundary && docsOnly;
  const securitySensitive = normalizedTags.some((tag) => ['security', 'auth', 'token', 'secret', 'token-secret', 'credential', 'credentials', 'permission', 'sql-injection'].includes(tag));
  const externalUnknown = normalizedTags.includes('external-unknown');
  const externalKnown = normalizedTags.includes('external');
  const contextRisk = normalizedTags.includes('context-risk') || normalizedTags.includes('context-budget');
  const tokenRisk = normalizedTags.includes('token-risk');
  const performanceRisk = normalizedTags.includes('performance') || normalizedTags.includes('latency') || normalizedTags.includes('cost');
  const highRiskTag = normalizedTags.some((tag) => HIGH_RISK_TAGS.has(tag));
  const mediumRiskTag = normalizedTags.length > 0;
  const reasons: string[] = [];

  if (sourceBoundary) {
    reasons.push('Task touches CLI/core source boundary files.');
  }
  if (runtimeStateBoundary) {
    reasons.push('Task touches runtime state or artifact storage paths.');
  }
  if (highRiskTag) {
    reasons.push(`Task declares high-risk tags: ${normalizedTags.filter((tag) => HIGH_RISK_TAGS.has(tag)).join(', ')}.`);
  }
  if (securitySensitive) {
    reasons.push('Task is security-sensitive.');
  }
  if (externalUnknown) {
    reasons.push('Task depends on external behavior with unknown impact.');
  }
  if (externalKnown) {
    reasons.push('Task depends on known external or third-party behavior.');
  }
  if (contextRisk || tokenRisk || performanceRisk) {
    reasons.push('Task declares context, token, or performance risk signals.');
  }

  const riskLevel: TaskRiskLevel = sourceBoundary || highRiskTag || securitySensitive || externalUnknown ? 'high' : runtimeStateBoundary || mediumRiskTag || externalKnown || (task?.affectedFiles?.length ?? 0) > 3 ? 'medium' : 'low';
  const teamRecommendation = riskLevel === 'high' ? 'team-required' : riskLevel === 'medium' || hasReviewArtifactRequirement(task) ? 'review-lite' : 'none';
  const approvalRecommendation = riskLevel === 'high' ? 'human-checkpoint' : riskLevel === 'medium' ? 'review' : 'direct';

  return {
    contract: 'sdd-task-risk-profile-v1',
    taskId: task?.id ?? null,
    riskLevel,
    rawTags: [...rawTags],
    normalizedTags,
    fileClasses,
    sourceBoundary,
    runtimeStateBoundary,
    docsOnly,
    validationOnly,
    securitySensitive,
    externalUnknown,
    externalKnown,
    contextRisk,
    tokenRisk,
    performanceRisk,
    teamRecommendation,
    approvalRecommendation,
    reasons: reasons.length > 0 ? reasons : ['No source-boundary, runtime-state, security, external, context, token, performance, or high-risk tag signals were detected.']
  };
}

export function normalizeRiskTag(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return '';
  }
  if (normalized === 'highrisk') {
    return 'high-risk';
  }
  if (normalized === 'state-machine' || normalized === 'state-machines') {
    return 'state-machine';
  }
  if (normalized === 'api' || normalized === 'api-contract') {
    return 'api-schema';
  }
  if (normalized === 'build' || normalized === 'ci') {
    return 'ci-build';
  }
  if (normalized === 'data-loss' || normalized === 'database-data-loss') {
    return 'data-loss';
  }
  if (normalized === 'external' || normalized === 'third-party') {
    return 'external';
  }
  if (normalized === 'external-unknown' || normalized === 'unknown-external') {
    return 'external-unknown';
  }
  if (normalized === 'unknown' || normalized === 'blocked-unknown') {
    return 'unknown';
  }
  if (normalized === 'context') {
    return 'context-risk';
  }
  if (normalized === 'tokens' || normalized === 'token-budget') {
    return 'token-risk';
  }
  return normalized;
}

export function classifyTaskFile(filePath: string): TaskFileClass {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (/^packages\/cli\/src\//.test(normalized)) {
    return normalized.endsWith('.test.ts') ? 'test-source' : 'cli-source';
  }
  if (/^packages\/core\/src\//.test(normalized)) {
    return normalized.endsWith('.test.ts') ? 'test-source' : 'core-source';
  }
  if (/^packages\/.+\.test\.ts$/.test(normalized) || /(^|\/)test-support\//.test(normalized)) {
    return 'test-source';
  }
  if (/^\.sdd\//.test(normalized) || /^runs\//.test(normalized) || /^artifacts\//.test(normalized)) {
    return 'runtime-state';
  }
  if (/^\.claude\//.test(normalized) || /^commands\//.test(normalized) || /^agents\//.test(normalized) || /^workflows\//.test(normalized)) {
    return 'generated-ai-entry';
  }
  if (/^api\/.*\.(ya?ml|json)$/i.test(normalized) || /(^|\/)(openapi|swagger)\.(ya?ml|json)$/i.test(normalized)) {
    return 'api-schema';
  }
  if (/release\.md$/.test(normalized)) {
    return 'release-doc';
  }
  if (/^(specs|docs|context)\//.test(normalized) || /(^|\/)(README|CHANGELOG)\.md$/i.test(normalized)) {
    return 'spec-doc';
  }
  return 'unknown';
}

function hasReviewArtifactRequirement(task: Pick<TaskRiskProfileInput, 'requiredArtifacts'> | null | undefined): boolean {
  return Boolean(task?.requiredArtifacts?.some((artifact) => /review|validation|security|验证|评审|安全/i.test(artifact)));
}

const HIGH_RISK_TAGS = new Set([
  'high-risk',
  'source-boundary',
  'platform-runtime',
  'state-machine',
  'concurrency',
  'database',
  'data-loss',
  'sql',
  'security',
  'api-schema',
  'ci-build',
  'external-unknown',
  'token',
  'secret',
  'token-secret',
  'unknown',
  'multi-agent-review',
  'evidence-semantics'
]);
