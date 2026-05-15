import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { initProject } from '../config/init-project.js';
import {
  adaptiveTeamTaskMarkdown,
  appendProjectRuntimeConfig,
  phase63FrontendTaskMarkdown,
  phase63InvalidProjectRuntimeConfig,
  phase63ProjectRuntimeConfig,
  writeBranchDocs
} from '../test-support/fixtures.js';
import {
  inspectAgentSkillTeamRuntime,
  inspectCapabilitySource,
  inspectExternalAgentPackImport,
  inspectSkillCapability,
  inspectTeamModePolicy,
  listCapabilitySources,
  listSkillCapabilities,
  routeSddTask,
  validateAgentSkillTeamRuntime
} from './route-sdd-task.js';

test('Phase 6 agent skill team runtime exposes reusable contracts and router decisions', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase60-runtime-'));
  try {
    await initProject(root);

    const runtime = await inspectAgentSkillTeamRuntime(root);
    const validation = await validateAgentSkillTeamRuntime(root);
    const skillCapabilities = await listSkillCapabilities(root);
    const hashlineCapability = await inspectSkillCapability(root, 'host.edit.hashline');
    const sourceCatalog = await listCapabilitySources(root);
    const agencySource = await inspectCapabilitySource(root, 'agency_agents_material');
    const agencyImport = await inspectExternalAgentPackImport(root, 'agency_agents_material');
    const teamDefault = await inspectTeamModePolicy(root);
    const teamEnabled = await inspectTeamModePolicy(root, { taskId: 'ONBOARDING-1', branch: 'master', enabled: true });
    const route = await routeSddTask(root, { taskId: 'ONBOARDING-1', branch: 'master', teamModeEnabled: true });

    assert.equal(runtime.version, 'phase-6.0-agent-skill-team-runtime-v1');
    assert.equal(runtime.teamMode.decision, 'disabled');
    assert.equal(runtime.profiles.some((profile) => profile.id === 'orchestrator'), true);
    assert.equal(runtime.profiles.some((profile) => profile.id === 'security'), true);
    assert.equal(runtime.skillCapabilities.some((capability) => capability.id === 'claude.subagent.researcher'), true);
    assert.equal(validation.valid, true);
    assert.equal(skillCapabilities.capabilities.some((capability) => capability.id === 'external.agency_agents.material'), true);
    assert.ok(hashlineCapability);
    assert.equal(hashlineCapability.reuseDecision, 'reuse_direct');
    assert.equal(sourceCatalog.sources.some((source) => source.id === 'ohmy_team_mode'), true);
    assert.ok(agencySource);
    assert.equal(agencySource.quarantineRequired, true);
    assert.equal(agencyImport.status, 'quarantined');
    assert.equal(agencyImport.checks.some((check) => check.check === 'dangerous_command_scan'), true);
    assert.equal(teamDefault.decision, 'disabled');
    assert.equal(teamDefault.activation, 'off');
    assert.equal(teamDefault.mode, 'off');
    assert.equal(teamEnabled.decision, 'enabled');
    assert.equal(teamEnabled.activation, 'force');
    assert.equal(teamEnabled.mode, 'review-lite');
    assert.equal(route.version, 'phase-6.0-agent-router-v1');
    assert.equal(route.taskId, 'ONBOARDING-1');
    assert.equal(route.recommendedProfile, 'researcher');
    assert.equal(route.requiredCapabilities.includes('context7.docs'), true);
    assert.equal(route.toolPermission?.policy, 'allow');
    assert.equal(route.teamMode.activation, 'force');
    assert.equal(route.teamMode.mode, 'review-lite');
    assert.equal(route.teamMode.costClass, 'low');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6 adaptive team-mode routes choose cost-bounded agent teams automatically', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase60-adaptive-team-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${adaptiveTeamTaskMarkdown('LOW', { allowedAgents: ['implementer'] })}\n${adaptiveTeamTaskMarkdown('REVIEW', { allowedAgents: ['reviewer'], requiredArtifacts: ['artifacts/review-REVIEW.md'] })}\n${adaptiveTeamTaskMarkdown('HIGH', { allowedAgents: ['implementer'], risk: ['database'] })}\n${adaptiveTeamTaskMarkdown('SECURITY', { allowedAgents: ['security'], risk: ['security'] })}`);

    const low = await routeSddTask(root, { taskId: 'LOW', branch: 'master' });
    const review = await routeSddTask(root, { taskId: 'REVIEW', branch: 'master' });
    const high = await routeSddTask(root, { taskId: 'HIGH', branch: 'master' });
    const security = await routeSddTask(root, { taskId: 'SECURITY', branch: 'master' });
    const forced = await routeSddTask(root, { taskId: 'LOW', branch: 'master', teamModeActivation: 'force' });
    const disabled = await routeSddTask(root, { taskId: 'SECURITY', branch: 'master', teamModeActivation: 'off' });

    assert.equal(low.teamMode.activation, 'auto');
    assert.equal(low.teamMode.mode, 'off');
    assert.equal(low.teamMode.enabled, false);
    assert.equal(low.teamMode.costClass, 'none');
    assert.equal(low.teamMode.costRoute, 'downgraded');
    assert.match(low.teamMode.downgradeReason ?? '', /Low-risk task uses no team automation/);
    assert.equal(low.teamMode.trustPolicyEnforced, true);
    assert.equal(review.teamMode.activation, 'auto');
    assert.equal(review.teamMode.mode, 'review-lite');
    assert.equal(review.teamMode.enabled, true);
    assert.equal(review.teamMode.costClass, 'low');
    assert.equal(review.teamMode.costRoute, 'downgraded');
    assert.match(review.teamMode.downgradeReason ?? '', /Low-cost review-lite route/);
    assert.equal(review.teamMode.trustPolicyEnforced, true);
    assert.equal(review.teamMode.maxMembers <= 2, true);
    assert.equal(review.teamMode.waveRecommendation.includes('implementation_review'), true);
    assert.equal(high.teamMode.mode, 'hyperplan');
    assert.equal(high.teamMode.enabled, true);
    assert.equal(high.teamMode.costClass, 'high');
    assert.equal(high.teamMode.costRoute, 'no_downgrade');
    assert.equal(high.teamMode.downgradeReason, null);
    assert.equal(high.teamMode.trustPolicyEnforced, true);
    assert.equal(high.teamMode.maxMembers <= 4, true);
    assert.equal(high.teamMode.waveRecommendation.includes('hyperplan'), true);
    assert.equal(security.teamMode.mode, 'security-research');
    assert.equal(security.teamMode.costClass, 'high');
    assert.equal(security.teamMode.costRoute, 'no_downgrade');
    assert.equal(security.teamMode.downgradeReason, null);
    assert.equal(security.teamMode.trustPolicyEnforced, true);
    assert.equal(security.teamMode.maxMembers <= 3, true);
    assert.equal(security.teamMode.waveRecommendation.includes('security_research'), true);
    assert.equal(forced.teamMode.activation, 'force');
    assert.equal(forced.teamMode.mode, 'review-lite');
    assert.equal(forced.teamMode.costClass, 'low');
    assert.equal(forced.teamMode.costRoute, 'no_downgrade');
    assert.equal(forced.teamMode.downgradeReason, null);
    assert.equal(forced.teamMode.trustPolicyEnforced, true);
    assert.equal(disabled.teamMode.activation, 'off');
    assert.equal(disabled.teamMode.mode, 'off');
    assert.equal(disabled.teamMode.enabled, false);
    assert.equal(disabled.teamMode.costRoute, 'not_applicable');
    assert.equal(disabled.teamMode.trustPolicyEnforced, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('routeSddTask uses derived route cache and opt-in profiling only', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-route-cache-profile-'));
  try {
    await initProject(root);
    await writeBranchDocs(root, 'master', `# Tasks\n\n${adaptiveTeamTaskMarkdown('CACHE', { allowedAgents: ['reviewer'], requiredArtifacts: ['artifacts/review-CACHE.md'] })}`);

    const uncached = await routeSddTask(root, { taskId: 'CACHE', branch: 'master' });
    const first = await routeSddTask(root, { taskId: 'CACHE', branch: 'master', cache: true, profile: true });
    const second = await routeSddTask(root, { taskId: 'CACHE', branch: 'master', cache: true });
    const third = await routeSddTask(root, { taskId: 'CACHE', branch: 'master', cache: true, profile: true });

    assert.equal(uncached.cache, undefined);
    assert.equal(uncached.profile, undefined);
    assert.equal(first.cache?.status, 'stored');
    assert.equal(first.cache?.source, 'content_addressed_derived_route');
    assert.equal(first.cache?.authoritative, false);
    assert.ok(first.profile);
    assert.equal(first.profile.every((span) => span.contract === 'phase-6.9-runtime-profile-v1'), true);
    assert.equal(first.profile.some((span) => span.name === 'route_compute'), true);
    assert.equal(first.teamMode.costRoute, 'downgraded');
    assert.equal(first.teamMode.trustPolicyEnforced, true);
    assert.equal(second.cache?.status, 'hit');
    assert.equal(second.cache?.authoritative, false);
    assert.equal(second.profile, undefined);
    assert.equal(third.cache?.status, 'hit');
    assert.ok(third.profile);
    assert.equal(third.profile.some((span) => span.name === 'route_total'), true);
    assert.equal(third.profile.some((span) => span.name === 'route_compute'), false);

    await writeBranchDocs(root, 'master', `# Tasks\n\n${adaptiveTeamTaskMarkdown('CACHE', { allowedAgents: ['reviewer'], requiredArtifacts: ['artifacts/review-CACHE.md'] })}\n\nCache key invalidation fixture.`);
    const invalidated = await routeSddTask(root, { taskId: 'CACHE', branch: 'master', cache: true });

    assert.equal(invalidated.cache?.status, 'stored');
    assert.notEqual(invalidated.cache?.key, first.cache?.key);
    assert.equal(invalidated.cache?.authoritative, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.3 project agent runtime merges project config and routes by alias and rule', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase63-runtime-'));
  try {
    await initProject(root);
    await appendProjectRuntimeConfig(root, phase63ProjectRuntimeConfig());
    await writeBranchDocs(root, 'master', phase63FrontendTaskMarkdown('FRONTEND-1'));

    const runtime = await inspectAgentSkillTeamRuntime(root);
    const validation = await validateAgentSkillTeamRuntime(root);
    const skillCapabilities = await listSkillCapabilities(root);
    const frontendCapability = await inspectSkillCapability(root, 'project.skill.frontend_review');
    const frontendSource = await inspectCapabilitySource(root, 'project_frontend_material');
    const pack = await inspectExternalAgentPackImport(root, 'project_frontend_material');
    const route = await routeSddTask(root, { taskId: 'FRONTEND-1', branch: 'master' });

    assert.equal(validation.valid, true);
    assert.equal(runtime.profiles.some((profile) => profile.id === 'frontend'), true);
    assert.equal(runtime.skillCapabilities.some((capability) => capability.id === 'project.skill.frontend_review'), true);
    assert.equal(runtime.capabilitySources.some((source) => source.id === 'project_frontend_material'), true);
    assert.equal(runtime.registrySources?.some((source) => source.id === 'frontend' && source.origin === 'project_config'), true);
    assert.equal(skillCapabilities.registrySources?.some((source) => source.id === 'project.skill.frontend_review' && source.origin === 'project_config'), true);
    assert.ok(frontendCapability);
    assert.equal(frontendCapability.evidenceType, 'artifact');
    assert.ok(frontendSource);
    assert.equal(frontendSource.quarantineRequired, true);
    assert.equal(pack.status, 'quarantined');
    assert.equal(route.recommendedProfile, 'frontend');
    assert.equal(route.allowedProfiles.includes('frontend'), true);
    assert.equal(route.requiredCapabilities.includes('project.skill.frontend_review'), true);
    assert.equal(route.requiredCapabilities.includes('playwright.browser_validation'), true);
    assert.equal(route.resolvedAliases?.some((alias) => alias.input === 'frontend-dev' && alias.resolved === 'frontend'), true);
    assert.equal(route.routingRuleHits?.includes('frontend-default'), true);
    assert.equal(route.registrySources?.some((source) => source.id === 'frontend' && source.origin === 'project_config'), true);
    assert.equal((route.quarantineWarnings?.length ?? 0) > 0, true);
    assert.equal(route.adapterMapping?.hostAdapter, 'claude_code');
    assert.equal(route.toolPermission?.toolGroups.includes('browser'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Phase 6.3 invalid agent runtime declarations fail closed', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-phase63-invalid-runtime-'));
  try {
    await initProject(root);
    await appendProjectRuntimeConfig(root, phase63InvalidProjectRuntimeConfig());

    const validation = await validateAgentSkillTeamRuntime(root);
    const issueText = validation.issues.map((issue) => `${issue.field}: ${issue.message}`).join('\n');

    assert.equal(validation.valid, false);
    assert.match(issueText, /agent_runtime\.aliases\.frontend_dev/);
    assert.match(issueText, /Alias points to unknown profile missing_profile/);
    assert.match(issueText, /bad-rule\.preferProfile/);
    assert.match(issueText, /missing\.capability/);
    assert.match(issueText, /project\.skill\.bad\.evidenceType/);
    assert.match(issueText, /unknown source missing_source/);
    assert.match(issueText, /unsafe_source\.attribution/);
    assert.match(issueText, /Quarantined source cannot be reused directly/);
    assert.match(issueText, /Quarantined source requests prompt import, direct execution, or lifecycle authority/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
