import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function appendProjectRuntimeConfig(root: string, runtimeConfig: string): Promise<void> {
  const configPath = path.join(root, '.sdd', 'project.yml');
  const current = await readFile(configPath, 'utf8');
  await writeFile(configPath, `${current.trimEnd()}\n${runtimeConfig.trim()}\n`, 'utf8');
}

export function phase63ProjectRuntimeConfig(): string {
  return `agent_runtime:
  capability_sources:
    - id: project_frontend_material
      name: Project frontend material
      kind: open_source_material
      source_ref: docs/external/frontend-agent-manifest.yml
      reuse_decision: adapt_via_host_adapter
      quarantine_required: true
      allowed_use: declarative taxonomy and capability mapping only
      attribution: project frontend manifest
      rationale: project-provided agent metadata for validated contracts only
  skill_capabilities:
    - id: project.skill.frontend_review
      name: Project frontend review skill
      kind: skill
      source: project
      source_ref: project_frontend_material
      capability_domain:
        - frontend
        - review
        - ui
      allowed_stages:
        - plan
        - do
        - review
        - verify
      required_risk_ceiling: compact_boundary_only
      evidence_type: artifact
      reuse_decision: adapt_via_host_adapter
  profiles:
    - id: frontend
      extends: implementer
      stage_scope:
        - do
        - review
      risk_ceiling: compact_boundary_only
      default_autonomy: compact_boundary_only
      required_artifacts:
        - implementation artifact
        - browser validation evidence
      tool_scope:
        - read
        - edit
        - test
        - browser
      model_policy_id: balanced
      host_capability_requirements:
        - host.search.grep_glob
        - host.edit.hashline
        - playwright.browser_validation
        - project.skill.frontend_review
      boundaries:
        - edit declared frontend scope only
        - browser validation must be evidence-backed
  aliases:
    frontend-dev: frontend
  routing_rules:
    - id: frontend-default
      when:
        keywords:
          - frontend
          - ui
        affected_file_globs:
          - "**/*.tsx"
      prefer_profile: frontend
      require_capabilities:
        - project.skill.frontend_review
        - playwright.browser_validation
      category: implementation
  adapter_mappings:
    - profile: frontend
      host_adapter: claude_code
      projection: generated subagent profile
      permission_policy: compact frontend tool scope`;
}

export function phase63InvalidProjectRuntimeConfig(): string {
  return `agent_runtime:
  capability_sources:
    - id: unsafe_source
      name: Unsafe external material
      kind: open_source_material
      source_ref: docs/external/unsafe-agent-pack.yml
      reuse_decision: reuse_direct
      quarantine_required: true
      allowed_use: direct execution and prompt import
      attribution: ""
      rationale: lifecycle authority request
  skill_capabilities:
    - id: project.skill.bad
      name: Bad project skill
      kind: skill
      source: project
      source_ref: missing_source
      capability_domain:
        - frontend
      allowed_stages:
        - do
      required_risk_ceiling: compact_boundary_only
      reuse_decision: adapt_via_host_adapter
  profiles:
    - id: bad_profile
      extends: implementer
      host_capability_requirements:
        - missing.capability
  aliases:
    frontend-dev: missing_profile
  routing_rules:
    - id: bad-rule
      when:
        keywords:
          - frontend
      prefer_profile: missing_profile
      require_capabilities:
        - missing.capability
      category: implementation`;
}

export function phase63FrontendTaskMarkdown(taskId: string): string {
  return `# Tasks

### ${taskId}: Frontend runtime route

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
affected_files:
  - src/App.tsx
validation:
  - browser validation with Playwright
allowed_agents:
  - frontend-dev
agent_fit:
  - frontend-dev
required_artifacts:
  - artifacts/browser-${taskId}.md
risk: []
\`\`\`

#### Boundary

Stay inside the declared frontend files.

#### Acceptance

- Browser validation evidence is captured.
`;
}

export async function writeBranchDocs(root: string, branch: string, tasksMarkdown: string): Promise<void> {
  const branchDir = path.join(root, 'specs', branch);
  await mkdir(branchDir, { recursive: true });
  await writeFile(path.join(branchDir, 'spec.md'), '# Spec\n', 'utf8');
  await writeFile(path.join(branchDir, 'plan.md'), '# Plan\n', 'utf8');
  await writeFile(path.join(branchDir, 'tasks.md'), tasksMarkdown, 'utf8');
}

export function hashTestDocument(raw: string): string {
  return createHash('sha256').update(raw.replace(/\r\n/g, '\n'), 'utf8').digest('hex');
}

export function validResultArtifact(agent: string, task: string, status: string, artifactPath: string): string {
  return `# ${agent} result\n\n\`\`\`sdd-result\ncontract: sdd-result-v1\nversion: 1.3.0\nagent: ${agent}\ntask: ${task}\nstatus: ${status}\nartifacts:\n  - ${artifactPath}\n\`\`\`\n`;
}

export function validTrustEvidence(task: string, acceptance: string, artifactPath: string): string {
  return `\n\`\`\`sdd-evidence\ncontract: sdd-evidence-v1\nversion: 1.0.0\ntask: ${task}\nacceptance: ${acceptance}\nstatus: PASS\nclaim: Validation proves ${acceptance}.\nsource_artifact: ${artifactPath}\nevidence_refs:\n  - command:npm test\nprovenance_refs:\n  - artifact:${artifactPath}\npolicy_refs:\n  - acceptance-policy-v1:require-source-evidence\n\`\`\`\n`;
}

export function validTaskMarkdown(taskId: string, dependsOn: string[]): string {
  const dependsOnBlock = dependsOn.length === 0 ? 'depends_on: []' : `depends_on:\n${dependsOn.map((dependency) => `  - ${dependency}`).join('\n')}`;
  return `# Tasks

### ${taskId}: Valid task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
${dependsOnBlock}
acceptance_refs:
  - AC-1
plan_refs:
  - "§4 Target Design Overview"
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test
risk: []
\`\`\`

#### Boundary

Stay in parser files only.

#### Acceptance

- Parser behavior is covered.
`;
}

export function taskMarkdownWithFiles(taskId: string, files: string[], risk: string[]): string {
  const affectedFilesBlock = files.length === 0 ? 'affected_files: []' : `affected_files:\n${files.map((file) => `  - ${file}`).join('\n')}`;
  const riskBlock = risk.length === 0 ? 'risk: []' : `risk:\n${risk.map((item) => `  - ${item}`).join('\n')}`;
  return `### ${taskId}: Isolation task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
${affectedFilesBlock}
validation:
  - npm test
${riskBlock}
\`\`\`

#### Acceptance

- Isolation decision is inspectable.
`;
}

export function adaptiveTeamTaskMarkdown(taskId: string, options: { allowedAgents: string[]; requiredArtifacts?: string[]; risk?: string[]; autonomy?: string; affectedFiles?: string[] }): string {
  const risk = options.risk ?? [];
  const requiredArtifacts = options.requiredArtifacts ?? [];
  const affectedFiles = options.affectedFiles ?? ['packages/core/src/index.ts'];
  const allowedAgentsBlock = `allowed_agents:\n${options.allowedAgents.map((agent) => `  - ${agent}`).join('\n')}`;
  const requiredArtifactsBlock = requiredArtifacts.length === 0 ? 'required_artifacts: []' : `required_artifacts:\n${requiredArtifacts.map((artifact) => `  - ${artifact}`).join('\n')}`;
  const affectedFilesBlock = affectedFiles.length === 0 ? 'affected_files: []' : `affected_files:\n${affectedFiles.map((file) => `  - ${file}`).join('\n')}`;
  const riskBlock = risk.length === 0 ? 'risk: []' : `risk:\n${risk.map((item) => `  - ${item}`).join('\n')}`;
  const autonomyBlock = options.autonomy ? `autonomy: ${options.autonomy}\n` : '';
  return `### ${taskId}: Adaptive team task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
${affectedFilesBlock}
validation:
  - npm test
${allowedAgentsBlock}
${requiredArtifactsBlock}
${riskBlock}
${autonomyBlock}\`\`\`

#### Boundary

Stay within the declared adaptive routing fixture.

#### Acceptance

- Adaptive team-mode decision is inspectable.
`;
}

export function graphTaskMarkdown(taskId: string, dependsOn: string[], files: string[], risk: string[]): string {
  const dependsOnBlock = dependsOn.length === 0 ? 'depends_on: []' : `depends_on:\n${dependsOn.map((dependency) => `  - ${dependency}`).join('\n')}`;
  const affectedFilesBlock = files.length === 0 ? 'affected_files: []' : `affected_files:\n${files.map((file) => `  - ${file}`).join('\n')}`;
  const riskBlock = risk.length === 0 ? 'risk: []' : `risk:\n${risk.map((item) => `  - ${item}`).join('\n')}`;
  return `### ${taskId}: Graph task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
${dependsOnBlock}
${affectedFilesBlock}
validation:
  - npm test
${riskBlock}
\`\`\`

#### Boundary

Stay in graph planning only.

#### Acceptance

- Graph output is inspectable.
`;
}

export function harnessTaskMarkdown(taskId: string): string {
  return `### ${taskId}: Harness task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
affected_files:
  - packages/core/src/index.ts
file_ownership:
  - packages/core/src/index.ts
risk:
  - runtime-evidence
agent_fit:
  - implementer
  - validator
verification_availability:
  - unit-test
  - cli-smoke
autonomy: foreground_write
allowed_agents:
  - implementer
  - validator
required_artifacts:
  - artifacts/implementer-${taskId}.md
  - artifacts/validation-${taskId}.md
gap_state: none
validation:
  - npm test
\`\`\`

#### Boundary

Stay inside Phase 5.3 metadata parsing.

#### Acceptance

- Harness metadata is parsed.
`;
}

export function withManagedHash(content: string): string {
  const body = content.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
  return content.replace(/^sdd_hash:\s*sha256:[a-f0-9]+\s*$/m, `sdd_hash: sha256:${createHash('sha256').update(body, 'utf8').digest('hex')}`);
}

export function contextBuildTaskMarkdown(taskId: string): string {
  return `# Tasks

### ${taskId}: Context package task

\`\`\`sdd-task
id: ${taskId}
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
plan_refs:
  - "§6 Context Build Packages"
affected_files:
  - packages/core/src/index.ts
validation:
  - npm test
risk: []
required_artifacts:
  - artifacts/implement-${taskId}.md
  - artifacts/validation-${taskId}.md
\`\`\`

#### Boundary

Stay inside context package runtime.

#### Acceptance

- Context package is deterministic.
`;
}
