import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ACCEPTANCE_POLICY_RULESET_VERSION,
  AGENT_ROUTER_CONTRACT_VERSION,
  AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
  ROUTE_CACHE_CONTRACT_VERSION,
  RUNTIME_PROFILE_CONTRACT_VERSION,
  TEAM_MODE_POLICY_VERSION
} from '../contracts.js';
import { getRouteCachePath } from '../runtime-paths.js';
import { exists } from '../storage/json-io.js';
import { TOOL_CAPABILITY_REGISTRY_VERSION } from '../registries/tool-capabilities.js';
import { TOOL_PLUGIN_CONTRACT_REGISTRY_VERSION } from '../registries/tool-plugins.js';
import { WORKER_ADAPTER_CONTRACT_REGISTRY_VERSION } from '../registries/worker-adapters.js';
export type TeamModeActivation = 'auto' | 'force' | 'off';

export interface RouteCacheMetadata {
  contract: typeof ROUTE_CACHE_CONTRACT_VERSION;
  key: string;
  status: 'hit' | 'miss' | 'stored';
  source: 'content_addressed_derived_route';
  authoritative: false;
}

export interface RuntimeProfileSpan {
  contract: typeof RUNTIME_PROFILE_CONTRACT_VERSION;
  name: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
}

export interface RouteCacheDocuments {
  specHash?: string | null;
  planHash?: string | null;
  tasksHash?: string | null;
  planBasedOnSpecHash?: string | null;
  tasksBasedOnPlanHash?: string | null;
}

export interface CacheableRouteDecision {
  version: typeof AGENT_ROUTER_CONTRACT_VERSION;
  cache?: RouteCacheMetadata;
  profile?: RuntimeProfileSpan[];
}

export function runtimeProfileSpan(name: string, startedAtMs: number, startedAt = new Date(startedAtMs).toISOString()): RuntimeProfileSpan {
  const endedAtMs = Date.now();
  return {
    contract: RUNTIME_PROFILE_CONTRACT_VERSION,
    name,
    startedAt,
    endedAt: new Date(endedAtMs).toISOString(),
    durationMs: Math.max(0, endedAtMs - startedAtMs)
  };
}

export function routeCacheKey(input: { taskId: string; branch: string; agent: string | null; teamModeActivation: TeamModeActivation; approved?: boolean; documents: RouteCacheDocuments }): string {
  return createHash('sha256')
    .update(JSON.stringify({
      contract: ROUTE_CACHE_CONTRACT_VERSION,
      router: AGENT_ROUTER_CONTRACT_VERSION,
      teamMode: TEAM_MODE_POLICY_VERSION,
      policy: ACCEPTANCE_POLICY_RULESET_VERSION,
      runtime: AGENT_SKILL_TEAM_RUNTIME_CONTRACT_VERSION,
      capabilities: TOOL_CAPABILITY_REGISTRY_VERSION,
      plugins: TOOL_PLUGIN_CONTRACT_REGISTRY_VERSION,
      workers: WORKER_ADAPTER_CONTRACT_REGISTRY_VERSION,
      taskId: input.taskId,
      branch: input.branch,
      agent: input.agent,
      teamModeActivation: input.teamModeActivation,
      approved: input.approved === true,
      specHash: input.documents.specHash ?? null,
      planHash: input.documents.planHash ?? null,
      tasksHash: input.documents.tasksHash ?? null,
      planBasedOnSpecHash: input.documents.planBasedOnSpecHash ?? null,
      tasksBasedOnPlanHash: input.documents.tasksBasedOnPlanHash ?? null
    }))
    .digest('hex')
    .slice(0, 32);
}

export async function readRouteCache<TDecision extends CacheableRouteDecision>(projectRoot: string, key: string): Promise<TDecision | null> {
  const cachePath = getRouteCachePath(projectRoot, key);
  if (!await exists(cachePath)) {
    return null;
  }
  const parsed = JSON.parse(await readFile(cachePath, 'utf8')) as TDecision;
  return parsed.version === AGENT_ROUTER_CONTRACT_VERSION ? parsed : null;
}

export async function writeRouteCache<TDecision extends CacheableRouteDecision>(projectRoot: string, key: string, decision: TDecision): Promise<void> {
  const cachePath = getRouteCachePath(projectRoot, key);
  await mkdir(path.dirname(cachePath), { recursive: true });
  const { cache: _cache, profile: _profile, ...cacheable } = decision;
  await writeFile(cachePath, `${JSON.stringify(cacheable, null, 2)}\n`, 'utf8');
}
