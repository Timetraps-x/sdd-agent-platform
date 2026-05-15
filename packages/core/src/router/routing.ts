import {
  AGENT_ROUTER_CONTRACT_VERSION,
  ROUTE_CACHE_CONTRACT_VERSION
} from '../contracts.js';
import { parseSddBranch } from '../sdd-docs/task-parser.js';
import { resolveSddContext } from '../sdd-docs/context.js';
import { inspectSddTask } from '../sdd-docs/task-inspection.js';
import { readRouteCache, routeCacheKey, runtimeProfileSpan, writeRouteCache } from './route-cache.js';
import type { RuntimeProfileSpan, TeamModeActivation } from './route-cache.js';
import { buildAgentSkillRuntimeRegistry } from './runtime-registry.js';
import { buildTeamModePolicy, resolveTeamModeActivation } from './team-mode.js';
import { matchRoutingRules } from './routing-rules.js';
import { chooseRecommendedProfile, deriveAllowedProfiles, toAgentProfileId } from './profile-resolution.js';
import { adapterMappingForProfile, buildRejectedProfiles, buildToolPermissionSpec, modelPolicyForProfile, quarantineWarningsForSources, routeCategory, routeRegistrySources, selectRequiredSkillCapabilities } from './route-projection.js';
import { taskAutonomyCeiling } from './risk-policy.js';
import type {
  AgentRouterDecision,
  TeamModePolicy
} from './agent-runtime.js';



export async function inspectTeamModePolicy(projectRoot: string, options: { taskId?: string; branch?: string; enabled?: boolean; teamModeActivation?: TeamModeActivation } = {}): Promise<TeamModePolicy> {
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  const activation = resolveTeamModeActivation({ teamModeEnabled: options.enabled, teamModeActivation: options.teamModeActivation }, options.taskId ? 'auto' : 'off');
  if (!options.taskId) {
    return buildTeamModePolicy({ activation });
  }
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const model = await parseSddBranch(projectRoot, branch);
  const inspected = inspectSddTask(model, options.taskId);
  const task = inspected.task;
  const blockingGap = inspected.gaps.find((gap) => gap.severity === 'blocking');
  const matchedRules = task && !blockingGap ? matchRoutingRules(task, registry) : [];
  const allowedProfiles = task && !blockingGap ? deriveAllowedProfiles(task, registry, matchedRules).profiles : [];
  const category = task ? routeCategory(task, blockingGap, allowedProfiles, matchedRules) : 'blocked';
  const autonomyCeiling = task ? taskAutonomyCeiling(task) : 'research_before_implementation';
  return buildTeamModePolicy({ activation, task, category, risk: task?.risk ?? [], autonomyCeiling, blockedReason: blockingGap?.message ?? null });
}

export async function routeSddTask(projectRoot: string, options: { taskId: string; branch?: string; agent?: string; teamModeEnabled?: boolean; teamModeActivation?: TeamModeActivation; profile?: boolean; cache?: boolean } = { taskId: '' }): Promise<AgentRouterDecision> {
  const profileSpans: RuntimeProfileSpan[] = [];
  const routeStart = Date.now();
  const routeStartedAt = new Date(routeStart).toISOString();
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  profileSpans.push(runtimeProfileSpan('agent_runtime_registry', routeStart));
  const branchStart = Date.now();
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const model = await parseSddBranch(projectRoot, branch);
  profileSpans.push(runtimeProfileSpan('document_parse', branchStart));
  const cacheKey = routeCacheKey({ taskId: options.taskId, branch, agent: options.agent ?? null, teamModeActivation: resolveTeamModeActivation(options, 'auto'), documents: model.documents });
  const cachedDecision = options.cache ? await readRouteCache<AgentRouterDecision>(projectRoot, cacheKey) : null;
  if (cachedDecision) {
    return {
      ...cachedDecision,
      cache: { contract: ROUTE_CACHE_CONTRACT_VERSION, key: cacheKey, status: 'hit', source: 'content_addressed_derived_route', authoritative: false },
      profile: options.profile ? [...(cachedDecision.profile ?? []), runtimeProfileSpan('route_total', routeStart, routeStartedAt)] : undefined
    };
  }
  const computeStart = Date.now();
  const inspected = inspectSddTask(model, options.taskId);
  const task = inspected.task;
  const blockingGap = inspected.gaps.find((gap) => gap.severity === 'blocking');
  const matchedRules = task && !blockingGap ? matchRoutingRules(task, registry) : [];
  const profileSelection = task && !blockingGap ? deriveAllowedProfiles(task, registry, matchedRules) : { profiles: [], resolvedAliases: [] };
  const delegatedProfile = task && !blockingGap && options.agent ? toAgentProfileId(options.agent, registry) : null;
  const allowedProfiles = delegatedProfile && !profileSelection.profiles.includes(delegatedProfile) ? [...profileSelection.profiles, delegatedProfile] : profileSelection.profiles;
  const taskRecommendedProfile = task && !blockingGap ? chooseRecommendedProfile(task, allowedProfiles, registry, matchedRules) : null;
  const recommendedProfile = delegatedProfile ?? taskRecommendedProfile;
  const category = task ? routeCategory(task, blockingGap, allowedProfiles, matchedRules) : 'blocked';
  const autonomyCeiling = task ? taskAutonomyCeiling(task) : 'research_before_implementation';
  const requiredCapabilities = task && recommendedProfile ? selectRequiredSkillCapabilities(task, recommendedProfile, registry, matchedRules) : [];
  const sourceCapability = requiredCapabilities[0] ?? null;
  const sourceCapabilityContract = sourceCapability ? registry.skillCapabilities.find((capability) => capability.id === sourceCapability) ?? null : null;
  const blockedReason = !task ? `Task ${options.taskId} was not found.` : blockingGap?.message ?? null;
  const routedCategory = blockedReason ? 'blocked' : category;
  const registrySources = routeRegistrySources(registry, recommendedProfile, requiredCapabilities);
  const adapterMapping = recommendedProfile ? adapterMappingForProfile(registry, recommendedProfile) : null;
  const decision: AgentRouterDecision = {
    version: AGENT_ROUTER_CONTRACT_VERSION,
    taskId: options.taskId,
    branch,
    category: routedCategory,
    recommendedProfile,
    allowedProfiles,
    rejectedProfiles: buildRejectedProfiles(allowedProfiles, blockedReason, registry),
    requiredCapabilities,
    sourceCapability,
    reuseDecision: sourceCapabilityContract?.reuseDecision ?? null,
    toolPermission: task && recommendedProfile ? buildToolPermissionSpec(task, recommendedProfile, autonomyCeiling, registry) : null,
    modelPolicy: modelPolicyForProfile(recommendedProfile, registry),
    teamMode: buildTeamModePolicy({
      activation: resolveTeamModeActivation(options, 'auto'),
      task: task ?? null,
      category: routedCategory,
      risk: task?.risk ?? [],
      autonomyCeiling,
      blockedReason
    }),
    autonomyCeiling,
    requiredArtifacts: task?.requiredArtifacts ?? [],
    blockedReason,
    nextAction: blockedReason ? `Fix task gaps before routing ${options.taskId}.` : recommendedProfile ? `Use ${recommendedProfile} with ${requiredCapabilities.join(',') || 'no extra capability'} and preserve required artifacts before verify.` : `Declare a routable profile before routing ${options.taskId}.`,
    registrySources,
    resolvedAliases: profileSelection.resolvedAliases,
    routingRuleHits: matchedRules.map((rule) => rule.id),
    quarantineWarnings: quarantineWarningsForSources(registrySources),
    adapterMapping,
    cache: options.cache ? { contract: ROUTE_CACHE_CONTRACT_VERSION, key: cacheKey, status: 'miss', source: 'content_addressed_derived_route', authoritative: false } : undefined
  };
  profileSpans.push(runtimeProfileSpan('route_compute', computeStart));
  if (options.cache) {
    await writeRouteCache(projectRoot, cacheKey, decision);
    decision.cache = { contract: ROUTE_CACHE_CONTRACT_VERSION, key: cacheKey, status: 'stored', source: 'content_addressed_derived_route', authoritative: false };
  }
  if (options.profile) {
    decision.profile = [...profileSpans, runtimeProfileSpan('route_total', routeStart, routeStartedAt)];
  }
  return decision;
}