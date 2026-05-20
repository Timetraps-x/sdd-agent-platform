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
import { lifecycleAutonomyCeilingFromDecision, ensureLifecycleRiskDecision } from '../orchestration/runtime.js';
import { taskAutonomyCeiling } from './risk-policy.js';
import { evaluateTaskWorkflowGate } from '../risk.js';
import { nextDependencyTaskId, resolveTaskDependencyReadiness } from '../workflow-state/dependencies.js';
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

export async function routeSddTask(projectRoot: string, options: { taskId: string; branch?: string; agent?: string; teamModeEnabled?: boolean; teamModeActivation?: TeamModeActivation; profile?: boolean; cache?: boolean; approved?: boolean } = { taskId: '' }): Promise<AgentRouterDecision> {
  const profileSpans: RuntimeProfileSpan[] = [];
  const routeStart = Date.now();
  const routeStartedAt = new Date(routeStart).toISOString();
  const registry = await buildAgentSkillRuntimeRegistry(projectRoot);
  profileSpans.push(runtimeProfileSpan('agent_runtime_registry', routeStart));
  const branchStart = Date.now();
  const branch = options.branch ?? (await resolveSddContext(projectRoot)).branch;
  const model = await parseSddBranch(projectRoot, branch);
  profileSpans.push(runtimeProfileSpan('document_parse', branchStart));
  const cacheKey = routeCacheKey({ taskId: options.taskId, branch, agent: options.agent ?? null, teamModeActivation: resolveTeamModeActivation(options, 'auto'), approved: options.approved, documents: model.documents });
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
  const riskDecision = task ? await ensureLifecycleRiskDecision(projectRoot, model, { branch, task }) : null;
  const workflowGate = evaluateTaskWorkflowGate({ task, taskId: options.taskId, riskDecision, approved: options.approved });
  const lifecycleBlockedReason = workflowGate.blocksRoute
    ? workflowGate.primaryReason
    : null;
  const dependencyReadiness = task ? resolveTaskDependencyReadiness(model, options.taskId) : null;
  const dependencyBlockedReason = dependencyReadiness?.blockingReasons[0] ?? null;
  const dependencyTaskId = task ? nextDependencyTaskId(model, options.taskId) : null;
  const taskRecommendedProfile = task && !blockingGap && !dependencyBlockedReason && !lifecycleBlockedReason ? chooseRecommendedProfile(task, allowedProfiles, registry, matchedRules) : null;
  const recommendedProfile = dependencyBlockedReason || lifecycleBlockedReason ? null : delegatedProfile ?? taskRecommendedProfile;
  const category = task ? routeCategory(task, blockingGap, allowedProfiles, matchedRules) : 'blocked';
  const autonomyCeiling = riskDecision ? lifecycleAutonomyCeilingFromDecision(riskDecision) : task ? taskAutonomyCeiling(task) : 'research_before_implementation';
  const requiredCapabilities = task && recommendedProfile ? selectRequiredSkillCapabilities(task, recommendedProfile, registry, matchedRules) : [];
  const sourceCapability = requiredCapabilities[0] ?? null;
  const sourceCapabilityContract = sourceCapability ? registry.skillCapabilities.find((capability) => capability.id === sourceCapability) ?? null : null;
  const blockedReason = !task ? `Task ${options.taskId} was not found.` : blockingGap?.message ?? dependencyBlockedReason ?? lifecycleBlockedReason;
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
    lifecycleGate: workflowGate.lifecycleGate,
    lifecycleProfile: workflowGate.lifecycleProfile,
    approvalPolicy: workflowGate.approvalPolicy,
    requiredStages: workflowGate.requiredStages,
    primaryReason: workflowGate.primaryReason,
    requiredArtifacts: task?.requiredArtifacts ?? [],
    blockedReason,
    nextAction: routeNextAction({ taskId: options.taskId, taskExists: Boolean(task), hasBlockingGap: Boolean(blockingGap), dependencyTaskId, workflowGateNextAction: workflowGate.nextAction, recommendedProfile, requiredCapabilities }),
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

function routeNextAction(input: {
  taskId: string;
  taskExists: boolean;
  hasBlockingGap: boolean;
  dependencyTaskId: string | null;
  workflowGateNextAction: string;
  recommendedProfile: string | null;
  requiredCapabilities: string[];
}): string {
  if (!input.taskExists) {
    return `Create or restore task ${input.taskId} before routing.`;
  }
  if (input.hasBlockingGap) {
    return `Fix task gaps before routing ${input.taskId}.`;
  }
  if (input.dependencyTaskId) {
    return `Complete and sync-back ${input.dependencyTaskId} before routing ${input.taskId}.`;
  }
  if (input.workflowGateNextAction) {
    return input.workflowGateNextAction;
  }
  if (input.recommendedProfile) {
    return `Use ${input.recommendedProfile} with ${input.requiredCapabilities.join(',') || 'no extra capability'} and preserve required artifacts before verify.`;
  }
  return `Declare a routable profile before routing ${input.taskId}.`;
}