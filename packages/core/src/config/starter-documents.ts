function usesChineseInitDocs(value: string): boolean {
  return value === 'zh-CN';
}

export function renderInitSpecDocument(branch: string, timestamp: string, docsLanguage: string): string {
  const zh = usesChineseInitDocs(docsLanguage);
  const title = zh ? '# Spec: Project Onboarding / 项目入门' : '# Spec: Project Onboarding';
  const objectiveLines = zh ? `- User value: 仓库在第一个真实变更前已有可见的 SDD 入口。
- Business value: 待补充；请替换为第一个真实功能或变更目标。
- Engineering value: semantic documents、runtime config 与托管 AI entries 已安全初始化。
- Observable success: \`sdd status --branch ${branch}\` 报告 spec、plan、tasks 均已存在。` : `- User value: the repository has a visible SDD entrypoint before the first real change.
- Business value: pending; replace with the first real feature/change objective.
- Engineering value: semantic documents, runtime config, and managed AI entries are initialized safely.
- Observable success: \`sdd status --branch ${branch}\` reports spec, plan, and tasks as present.`;
  const problemIntent = zh
    ? '此项目已初始化 SDD。请在实现前用第一个真实功能或变更请求替换这份 onboarding spec。'
    : 'This project has been initialized for SDD. Replace this onboarding spec with the first real feature or change request before implementation.';
  const actorRow = zh
    ? '| repository maintainer | 安全的 SDD 起点 | 还没有写入项目专属的 SDD 请求 |'
    : '| repository maintainer | a safe SDD starting point | no project-specific SDD request has been written yet |';
  const story = zh
    ? 'As a repository maintainer, I want starter SDD documents, so that the first real change can be captured as requirements、design 与 executable tasks。'
    : 'As a repository maintainer, I want starter SDD documents, so that the first real change can be captured as requirements, design, and executable tasks.';
  return `---
template: sdd-init-onboarding-spec-v1
version: 1.4.0
contract: sdd-spec-doc-v1
sdd_managed_starter: true
---

${title}

## 0. Metadata

- spec_id: \`onboarding\`
- branch: \`${branch}\`
- lifecycle_profile: \`direct\`
- source_request: \`Created by sdd init\`
- status: \`draft\`
- created_at: \`${timestamp}\`
- updated_at: \`${timestamp}\`

## 1. Objective / Customer Value

${objectiveLines}

## 2. Problem / Intent

${problemIntent}

## 3. Users / Actors

| Actor | Need / Expectation | Current Pain |
|---|---|---|
${actorRow}

## 4. User Stories / Scenarios

### Story US-1

${story}

### Scenario S1: initialized repository

- Given: \`sdd init\` has run for branch \`${branch}\`.
- When: the maintainer runs \`sdd status --branch ${branch}\`.
- Then: the CLI reports starter spec, plan, and tasks documents as present.

## 5. Scope

### In Scope

- Confirm the project is initialized.
- Replace onboarding placeholders with a real spec, plan, and tasks when ready.

### Out of Scope

- Running background agents.
- Creating worktrees.
- Applying sync-back without explicit user approval.

## 6. Requirements

### Functional Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| FR-1 | \`sdd init\` creates the SDD runtime config and starter semantic documents. | Must | init |
| FR-2 | \`sdd status --branch ${branch}\` can inspect the initialized branch without missing document gaps. | Must | status |

### Non-functional Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| NFR-1 | Initialization must not overwrite user-authored SDD documents unless force is explicitly requested. | Must | safety |

## 7. Acceptance Criteria

| ID | Acceptance | Verification Hint | Priority |
|---|---|---|---|
| AC-1 | \`sdd status --branch ${branch}\` reports all three semantic documents as present. | CLI status | Must |
| AC-2 | Existing user-authored semantic documents are preserved by default. | init preserve behavior | Must |

## 8. Assumptions / Dependencies

| Item | Description | Impact if Wrong |
|---|---|---|
| first real request pending | onboarding docs are placeholders | implementation must not start from this scaffold |

## 9. Risks / Hard Gates

| Risk | Why it matters | Required Handling |
|---|---|---|
| scaffold mistaken for approved spec | could authorize vague implementation | replace with a real requirement contract before coding |

## 10. Open Questions

| ID | Question | Owner | Required Before |
|---|---|---|---|
| Q-1 | What is the first real feature or change request? | user | plan |

## 11. Lifecycle Decision Reference

- decision_artifact: \`pending\`
- canonical_model: \`docs/architecture/lifecycle-decision-model.md\`
- recommended_profile: \`direct\`
- risk_signals: []
- autonomy_ceiling: \`direct_execution_allowed\`
`;
}

export function renderInitPlanDocument(branch: string, timestamp: string, docsLanguage: string): string {
  const zh = usesChineseInitDocs(docsLanguage);
  const title = zh ? '# Plan: Project Onboarding / 项目入门' : '# Plan: Project Onboarding';
  const background = zh
    ? '在实现开始前，请用第一个真实功能或变更请求的业务背景与技术背景替换这份 starter plan。'
    : 'Replace this starter plan with the business and technical context for the first real feature or change request before implementation begins.';
  const goals = zh
    ? '- Goals: 写明本次变更必须交付的结果。\n- Non-goals: 写明防止范围蔓延的边界。'
    : '- Goals: replace with the outcomes this change must deliver.\n- Non-goals: replace with boundaries that prevent scope creep.';
  const currentState = zh
    ? '描述当前流程、代码区域、state/data/API 行为以及已知约束。'
    : 'Describe the current flow, code areas, state/data/API behavior, and known constraints.';
  const targetDesign = zh
    ? '描述已选择的技术方案，以及它为什么是从 spec 到 implementation 最安全的 task-ready 路径。'
    : 'Describe the selected technical solution and why it is the safest task-ready path from spec to implementation.';
  return `---
template: sdd-init-onboarding-plan-v1
version: 1.4.0
contract: sdd-plan-doc-v1
sdd_managed_starter: true
---

${title}

## Metadata

- spec_id: \`onboarding\`
- plan_id: \`onboarding\`
- branch: \`${branch}\`
- created_at: \`${timestamp}\`
- updated_at: \`${timestamp}\`

## 0.1 Requirement Trace

| Spec Item | Plan Section | Design Response |
|---|---|---|
| AC-1 | §13 Validation Plan | onboarding status check maps to validation evidence |
| AC-2 | §14 Task Breakdown Rationale | starter task boundary protects user-authored documents |

## 1. Background / Context

${background}

## 2. Goals and Non-goals

${goals}

## 3. Current State Analysis

${currentState}

## 4. Target Design Overview

${targetDesign}

## 5. Architecture / Component Design

Use PlantUML when component impact is non-trivial.

\`\`\`plantuml
@startuml
title Component Impact
component \"Existing Module\" as Existing
component \"Changed Module\" as Changed
database \"Data Store\" as DB
Existing --> Changed : call / event
Changed --> DB : read / write
@enduml
\`\`\`

## 6. Interaction / Sequence Design

Add a PlantUML sequence or activity diagram when cross-component flow, async work, or concurrency matters.

## 7. State / Data Design

Describe state machines, data model changes, persistence, idempotency, and migration/rollback impact.

## 8. Interface / API / Schema Design

Describe API, DTO, event, contract, or schema compatibility impact. Write \`None\` only after checking.

## 9. Concurrency / Transaction / Consistency Design

Describe transaction boundaries, locking/idempotency/retry behavior, and consistency guarantees when relevant.

## 10. Key Design Decisions

| Decision | Reason | Tradeoff | Rejected alternatives |
|---|---|---|---|
| Replace with decision | Replace with reason | Replace with tradeoff | Replace with alternatives |

## 11. Risk Control

| Risk | Impact | Control |
|---|---|---|
| Replace with risk | Replace with impact | Replace with mitigation |

## 12. Compatibility / Rollout / Rollback

Describe compatibility, rollout, feature flag/manual gate if needed, and rollback strategy.

## 13. Validation Plan

| Acceptance | Validation Method | Command / Evidence |
|---|---|---|
| AC-1 | Manual/automated check | \`<command or artifact>\` |

## 14. Task Breakdown Rationale

Explain why \`specs/${branch}/tasks.md\` should be split into the planned task boundaries.

## 15. Gaps / Assumptions

- Gap or assumption.

## 16. Risk-driven Plan Requirements

- state-machine risk: include state/data design and a PlantUML state diagram.
- concurrency risk: include sequence/activity diagram plus transaction/consistency design.
- database risk: include data, transaction, migration, and rollback design.
- api_schema risk: include interface/schema compatibility design.
- security/sql risk: include explicit risk controls.

## Phase Gate Checkpoint

- ready_for_tasks: \`true | false\`
- blockers: []
- required_user_decisions: []
`;
}

export function renderInitTasksDocument(branch: string, timestamp: string, docsLanguage: string): string {
  const zh = usesChineseInitDocs(docsLanguage);
  const title = zh ? '# Tasks: Project Onboarding / 项目入门' : '# Tasks: Project Onboarding';
  const boundary = zh
    ? 'Allowed scope 仅限于把 starter onboarding scaffold 替换为项目专属的 SDD requirements、plan 和 tasks。'
    : 'Allowed scope is limited to replacing this starter onboarding scaffold with project-specific SDD requirements, plan, and tasks.';
  const implementationNotes = zh
    ? '由 \`sdd init\` 创建，用作安全的 onboarding placeholder。开始真实 implementation 前必须替换。'
    : 'Created by \`sdd init\` as a safe onboarding placeholder. Replace before real implementation.';
  return `---
template: sdd-init-onboarding-tasks-v1
version: 1.4.0
contract: sdd-tasks-doc-v1
sdd_managed_starter: true
---

${title}

## 0. Metadata

- tasks_id: \`onboarding\`
- spec_id: \`onboarding\`
- plan_id: \`onboarding\`
- branch: \`${branch}\`
- lifecycle_profile: \`direct\`
- status: \`draft\`
- created_at: \`${timestamp}\`
- updated_at: \`${timestamp}\`

## 1. Delivery Map

| Task | Spec Acceptance | Plan Section | Boundary Reason |
|---|---|---|---|
| ONBOARDING-1 | AC-1, AC-2 | §13 Validation Plan, §14 Task Breakdown Rationale | replace placeholders before real implementation |

## 2. Wave Plan

| Wave | Tasks | Gate |
|---|---|---|
| 1 | ONBOARDING-1 | user provides the first real feature/change request |

## 3. Task List

### ONBOARDING-1: Replace starter SDD documents with the first real task

\`\`\`sdd-task
id: ONBOARDING-1
status: pending
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
  - AC-2
plan_refs:
  - "§13 Validation Plan"
  - "§14 Task Breakdown Rationale"
affected_files:
  - specs/${branch}/spec.md
  - specs/${branch}/plan.md
  - specs/${branch}/tasks.md
validation:
  - sdd status --branch ${branch}
risk: []
agent_fit:
  - scout
  - planner
  - spec-reviewer
allowed_agents:
  - scout
  - planner
  - spec-reviewer
required_artifacts: []
verification_availability:
  - inspect:sdd status --branch ${branch}
autonomy: direct_execution_allowed
\`\`\`

#### Boundary

${boundary}

Forbidden scope:

- Do not create worktrees.
- Do not start background agents.
- Do not commit changes.
- Do not apply sync-back automatically.

#### Acceptance

- AC-1: \`specs/${branch}/spec.md\` becomes a real requirement contract with objective, actors/scenarios, scoped requirements, AC IDs, assumptions/dependencies, and risk gates.
- AC-2: \`specs/${branch}/plan.md\` maps spec acceptance to a task-ready technical solution document with risk-driven design sections and validation evidence.
- AC-3: \`specs/${branch}/tasks.md\` maps acceptance/design refs to executable task blocks with boundary, agent/artifact/verification/autonomy fields, Definition of Done, and evidence expectations.

#### Definition of Done

- Starter placeholders are replaced by a real request.
- Every task maps to spec acceptance refs.
- High-risk tasks define required artifacts and reviewer/validator expectations.
- \`sdd status --branch ${branch}\` reports no blocking document or task parser gaps.

#### Evidence Expectations

| Artifact | Expected Content |
|---|---|
| spec document | requirement contract with AC IDs |
| plan document | technical solution with requirement trace and validation matrix |
| tasks document | execution/evidence contract with task boundary and refs |

#### Implementation Notes

${implementationNotes}

## 4. Dependency Notes

- Single starter task only.
- The \`wave: 1\` field is present only because the current parser requires a positive wave value; it must not be interpreted as permission to run background agents or multi-wave orchestration.

## 5. Phase Gate Checkpoint

- ready_for_implementation: \`false\`
- blockers:
  - Replace onboarding placeholders with real project requirements before implementation.
- required_user_decisions:
  - Confirm the first real feature/change request.
`;
}

export function renderInitVerifyDocument(branch: string, timestamp: string, docsLanguage: string): string {
  const zh = usesChineseInitDocs(docsLanguage);
  const title = zh ? '# Verify: Project Onboarding / 项目入门' : '# Verify: Project Onboarding';
  const purpose = zh
    ? '这份 verify.md 是从 starter tasks 派生的 verification guidance，不是 runtime evidence，也不替代 `/sdd:test` 产生的验证证据。'
    : 'This verify.md is task-derived verification guidance, not runtime evidence, and it does not replace validation evidence produced by `/sdd:test`.';
  const availability = zh
    ? '在替换真实 spec/plan/tasks 前，只能检查 onboarding scaffold 是否仍然可见且未被误当作已批准实现。'
    : 'Before replacing the real spec/plan/tasks, verification can only inspect that the onboarding scaffold is visible and not mistaken for approved implementation.';
  return `---
template: sdd-init-onboarding-verify-v1
version: 1.4.0
contract: sdd-verify-doc-v1
sdd_managed_starter: true
branch: ${branch}
created_at: ${timestamp}
updated_at: ${timestamp}
---

${title}

## 1. Purpose

${purpose}

## 2. Task Verification Matrix

| Task | Acceptance refs | Validation commands | Required artifacts | Verification availability |
|---|---|---|---|---|
| ONBOARDING-1 | AC-1<br>AC-2 | sdd status --branch ${branch}<br>sdd verifies inspect --branch ${branch} | none | ${availability} |

## 3. Verification Rules

- This starter verify contract does not authorize source changes, validation execution, runtime mutation, sync-back, commit, push, publish, or release.
- Replace starter spec, plan, tasks, and verify documents with a real branch contract before implementation.
- Runtime PASS is judged by \`/sdd:test\` / \`sdd test task <task_id> --branch ${branch}\`; low-level verify remains available for compatibility diagnostics.
- Re-run \`sdd verifies write --branch ${branch} --force\` only after reviewing changed task expectations.

## 4. Out of Scope

- This document is not evidence in \`.sdd/runtime.sqlite\`.
- This document is not a release, ship, or sync-back approval.
`;
}
