import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  AGENT_EXECUTION_RECORD_CONTRACT_VERSION,
  TEAM_SESSION_RECORD_CONTRACT_VERSION
} from '../contracts.js';
import {
  getAgentExecutionRecordPath,
  getAgentExecutionsDir,
  getTeamSessionRecordPath,
  getTeamSessionsDir
} from '../runtime-paths.js';
import { exists } from '../storage/json-io.js';
import { BUILT_IN_SKILL_CAPABILITIES } from '../registries/skill-capabilities.js';
import type { ArtifactResultIngestionRecord } from '../artifacts/ingestion.js';
import type {
  AgentExecutionRecord,
  AgentExecutionRecordStatus,
  AgentProfileId,
  AgentRouterDecision,
  TeamSessionRecord,
  TeamSessionRecordStatus
} from '../router/agent-runtime.js';

export async function writeAgentExecutionRecord(projectRoot: string, record: AgentExecutionRecord): Promise<AgentExecutionRecord> {
  await mkdir(getAgentExecutionsDir(projectRoot, record.runId), { recursive: true });
  await writeFile(getAgentExecutionRecordPath(projectRoot, record.runId, record.executionId), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return record;
}

export async function writeTeamSessionRecord(projectRoot: string, record: TeamSessionRecord): Promise<TeamSessionRecord> {
  await mkdir(getTeamSessionsDir(projectRoot, record.runId), { recursive: true });
  await writeFile(getTeamSessionRecordPath(projectRoot, record.runId, record.teamId), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return record;
}

export async function listAgentExecutionRecords(projectRoot: string, runId: string): Promise<AgentExecutionRecord[]> {
  const recordsDir = getAgentExecutionsDir(projectRoot, runId);
  if (!await exists(recordsDir)) {
    return [];
  }
  const entries = await readdir(recordsDir, { withFileTypes: true });
  const records: AgentExecutionRecord[] = [];
  for (const entry of entries.filter((candidate) => candidate.isFile() && candidate.name.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(recordsDir, entry.name), 'utf8');
      records.push(JSON.parse(raw) as AgentExecutionRecord);
    } catch {
      continue;
    }
  }
  return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.executionId.localeCompare(right.executionId));
}

export async function listTeamSessionRecords(projectRoot: string, runId: string): Promise<TeamSessionRecord[]> {
  const recordsDir = getTeamSessionsDir(projectRoot, runId);
  if (!await exists(recordsDir)) {
    return [];
  }
  const entries = await readdir(recordsDir, { withFileTypes: true });
  const records: TeamSessionRecord[] = [];
  for (const entry of entries.filter((candidate) => candidate.isFile() && candidate.name.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(recordsDir, entry.name), 'utf8');
      records.push(JSON.parse(raw) as TeamSessionRecord);
    } catch {
      continue;
    }
  }
  return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.teamId.localeCompare(right.teamId));
}

export function routeRecordSnapshot(route: AgentRouterDecision): AgentExecutionRecord['routeDecision'] {
  return {
    version: route.version,
    category: route.category,
    recommendedProfile: route.recommendedProfile,
    autonomyCeiling: route.autonomyCeiling,
    requiredCapabilities: route.requiredCapabilities,
    blockedReason: route.blockedReason
  };
}

export function routeRecordId(route: AgentRouterDecision, profile: AgentProfileId): string {
  const content = JSON.stringify({
    version: route.version,
    taskId: route.taskId,
    branch: route.branch,
    category: route.category,
    profile,
    recommendedProfile: route.recommendedProfile,
    autonomyCeiling: route.autonomyCeiling,
    requiredCapabilities: route.requiredCapabilities,
    toolPermissionProfile: route.toolPermission?.profile ?? null,
    toolPermissionPolicy: route.toolPermission?.policy ?? null,
    blockedReason: route.blockedReason
  });
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function sourceAttributionForCapabilities(capabilityIds: string[], route?: AgentRouterDecision): string[] {
  return capabilityIds.map((capabilityId) => {
    const routeSource = route?.registrySources?.find((source) => source.kind === 'skill_capability' && source.id === capabilityId);
    if (routeSource) {
      return `${capabilityId}:${routeSource.sourceId ?? routeSource.origin}`;
    }
    const capability = BUILT_IN_SKILL_CAPABILITIES.find((candidate) => candidate.id === capabilityId);
    return capability ? `${capability.id}:${capability.sourceRef}` : capabilityId;
  });
}

export function executionProfile(agent: string, route: AgentRouterDecision): AgentProfileId {
  const normalized = normalizeAgentToken(agent);
  return route.allowedProfiles.find((profile) => normalizeAgentToken(profile) === normalized) ?? toAgentProfileId(agent) ?? route.recommendedProfile ?? 'implementer';
}

export function buildAgentExecutionRecord(input: { runId: string; taskId: string; agent: string; route: AgentRouterDecision; status: AgentExecutionRecordStatus; delegationId?: string | null; queueItemId?: string | null; artifactPath?: string | null; ingestion?: ArtifactResultIngestionRecord | null; evidenceSummary: string }): AgentExecutionRecord {
  const now = new Date().toISOString();
  const profile = executionProfile(input.agent, input.route);
  return {
    version: AGENT_EXECUTION_RECORD_CONTRACT_VERSION,
    executionId: toSafeRecordId(input.delegationId ?? `${input.taskId}-${input.agent}`),
    runId: input.runId,
    taskId: input.taskId,
    profile,
    category: input.route.category,
    host: 'sdd-cli',
    hostSessionId: input.runId,
    hostTaskId: input.delegationId ?? null,
    modelPolicy: input.route.modelPolicy,
    toolPermission: input.route.toolPermission,
    capabilitiesUsed: input.route.requiredCapabilities,
    sourceAttribution: sourceAttributionForCapabilities(input.route.requiredCapabilities, input.route),
    artifacts: input.artifactPath ? [input.artifactPath] : input.ingestion?.artifactPath ? [input.ingestion.artifactPath] : [],
    status: input.status,
    delegationId: input.delegationId ?? null,
    queueItemId: input.queueItemId ?? null,
    ingestionStatus: input.ingestion?.status ?? null,
    resultStatus: input.ingestion?.resultStatus ?? null,
    routeId: routeRecordId(input.route, profile),
    routeDecision: routeRecordSnapshot(input.route),
    evidenceSummary: input.evidenceSummary,
    createdAt: now,
    updatedAt: now
  };
}

export function buildTeamSessionRecord(input: { runId: string; taskId: string | null; route: AgentRouterDecision; status: TeamSessionRecordStatus; artifacts: string[]; evidenceSummary: string }): TeamSessionRecord {
  const now = new Date().toISOString();
  return {
    version: TEAM_SESSION_RECORD_CONTRACT_VERSION,
    teamId: toSafeRecordId(`team-${input.runId}-${input.taskId ?? 'branch'}`),
    runId: input.runId,
    taskId: input.taskId,
    status: input.status,
    chiefProfile: input.route.teamMode.chiefProfile,
    memberProfiles: input.route.teamMode.memberProfiles,
    hostLayout: null,
    teamMode: input.route.teamMode,
    waves: input.route.teamMode.allowedWaves,
    messages: [{
      sender: 'runtime',
      receiver: 'team',
      taskRef: input.taskId,
      artifactRefs: input.artifacts,
      blocker: input.route.teamMode.blockedReason,
      evidenceSummary: input.evidenceSummary,
      createdAt: now
    }],
    artifacts: input.artifacts,
    evidenceSummary: input.evidenceSummary,
    createdAt: now,
    updatedAt: now
  };
}

export function toSafeRecordId(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized || 'record';
}

function normalizeAgentToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function toAgentProfileId(agent: string): AgentProfileId | null {
  const normalized = normalizeAgentToken(agent);
  return normalized.length > 0 ? normalized : null;
}
