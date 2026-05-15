---
contract: sdd-tasks-doc-v1
---

# Tasks: Context Budget Runtime and Non-authoritative Log Workers

## 0. Metadata

- tasks_id: `phase6.10-context-budget-runtime-log-workers`
- spec_id: `phase6.10-context-budget-runtime-log-workers`
- plan_id: `phase6.10-context-budget-runtime-log-workers`
- branch: `master`
- lifecycle_profile: `standard`
- status: `approved`
- retained_tasks:
  - `phase6.10-tasks.md`

## 1. Delivery Map

| Task | Spec Acceptance | Plan Section | Boundary Reason |
|---|---|---|---|
| PHASE6.10-1 | AC-1 | §3 Context Budget Contracts | stabilize projection contracts before CLI surfaces depend on them |
| PHASE6.10-2 | AC-2, AC-3 | §4 Output Projection Profiles | reduce default output while preserving forensic expansion |
| PHASE6.10-3 | AC-4, AC-8 | §5 Evidence Summary Projection | summarize evidence without creating source evidence |
| PHASE6.10-4 | AC-5 | §6 Context Build Packages | provide deterministic working sets for workflow modes |
| PHASE6.10-5 | AC-6 | §6 Context Build Packages | tailor context packages for implementer/reviewer/validator |
| PHASE6.10-6 | AC-7, AC-8 | §7 Log Worker Boundary and Trust Guard | allow subagent/log-worker summaries only outside workflow authority |
| PHASE6.10-7 | AC-9 | §8 Validation and Installed CLI Proof | prevent output budgets from regressing |
| PHASE6.10-8 | AC-10 | §8 Validation and Installed CLI Proof | prove installed CLI end-to-end before completion |

## 2. Wave Plan

| Wave | Tasks | Gate |
|---|---|---|
| 1 | PHASE6.10-1 | context projection contracts are typed/tested |
| 2 | PHASE6.10-2, PHASE6.10-3 | default output/evidence summaries are compact and non-authoritative |
| 3 | PHASE6.10-4, PHASE6.10-5 | mode and agent context packages are deterministic |
| 4 | PHASE6.10-6 | log worker boundary is enforced |
| 5 | PHASE6.10-7, PHASE6.10-8 | budget and installed CLI validation pass |

## 3. Task List

### PHASE6.10-1: Add context budget projection contracts

```sdd-task
id: PHASE6.10-1
status: completed
wave: 1
depends_on: []
acceptance_refs:
  - AC-1
plan_refs:
  - "§3 Context Budget Contracts"
affected_files:
  - packages/core/src/context/build-package.ts
  - packages/core/src/context/context-build.test.ts
validation:
  - npm run typecheck
  - npm test -- --test-name-pattern "context budget"
risk:
  - context_contract_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.10-1.md
  - artifacts/review-PHASE6.10-1.md
  - artifacts/validation-PHASE6.10-1.md
verification_availability:
  - inspect:packages/core/src/context/build-package.ts
  - inspect:packages/core/src/context/context-build.test.ts
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Define `ContextProfile`, `ContextSourceRef`, `CommandOutputSummary`, `EvidenceSummaryProjection`, `ContextBuildPackage`, `LogWorkerSummary`, and budget metadata.
- Mark all derived projections `authoritative=false` and `usableForPass=false`.

Forbidden scope:

- Do not change verify/doctor/sync-back authority semantics.
- Do not introduce external retrieval storage.

#### Acceptance

- AC-1: Contracts are stable, typed, JSON-renderable, and covered by tests.

#### Implementation Notes

- Sync-back applied from run `20260512-008` (2026-05-12T12:55:16.255Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.10-1.md`, `artifacts/validation-PHASE6.10-1.md`, `artifacts/acceptance-coverage-PHASE6.10-1.md`.

### PHASE6.10-2: Add context-profiled CLI output projection

```sdd-task
id: PHASE6.10-2
status: completed
wave: 2
depends_on:
  - PHASE6.10-1
acceptance_refs:
  - AC-2
  - AC-3
plan_refs:
  - "§4 Output Projection Profiles"
affected_files:
  - packages/core/src/context/command-summary.ts
  - packages/cli/src/main.ts
  - packages/core/src/context/context-build.test.ts
validation:
  - npm run typecheck
  - npm test -- --test-name-pattern "context profile|brief|forensic"
risk:
  - hidden_blocker
  - output_contract_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.10-2.md
  - artifacts/review-PHASE6.10-2.md
  - artifacts/validation-PHASE6.10-2.md
verification_availability:
  - inspect:packages/cli/src/main.ts
  - inspect:packages/core/src/context/command-summary.ts
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Add `brief | normal | forensic` profile parsing and renderer helpers.
- Keep blockers/current task/next action visible in brief output.
- Preserve full JSON and forensic expansion paths.

Forbidden scope:

- Do not hide failures or ask users to infer blockers from omitted details.

#### Acceptance

- AC-2/AC-3: Brief is compact and forensic remains complete or source-expandable.

#### Implementation Notes

- Sync-back applied from run `20260512-010` (2026-05-12T13:02:17.238Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.10-2.md`, `artifacts/validation-PHASE6.10-2.md`, `artifacts/acceptance-coverage-PHASE6.10-2.md`.

### PHASE6.10-3: Add hash-backed evidence summary projection

```sdd-task
id: PHASE6.10-3
status: completed
wave: 2
depends_on:
  - PHASE6.10-1
acceptance_refs:
  - AC-4
  - AC-8
plan_refs:
  - "§5 Evidence Summary Projection"
affected_files:
  - packages/core/src/context/evidence-summary.ts
  - packages/cli/src/main.ts
  - packages/core/src/context/context-build.test.ts
validation:
  - npm run typecheck
  - npm test -- --test-name-pattern "evidence summary|derived summary"
risk:
  - summary_false_authority
  - stale_projection
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.10-3.md
  - artifacts/review-PHASE6.10-3.md
  - artifacts/validation-PHASE6.10-3.md
verification_availability:
  - inspect:packages/core/src/context/evidence-summary.ts
  - inspect:packages/core/src/context/context-build.test.ts
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Add evidence summary API/CLI over run/task state.
- Include source path/hash, policy refs, issue counts, and non-authoritative markers.

Forbidden scope:

- Do not let evidence summary become PASS source evidence.

#### Acceptance

- AC-4/AC-8: Summary is useful for context but rejected as source evidence.

#### Implementation Notes

- Sync-back applied from run `20260512-011` (2026-05-12T13:04:03.186Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.10-3.md`, `artifacts/validation-PHASE6.10-3.md`, `artifacts/acceptance-coverage-PHASE6.10-3.md`.

### PHASE6.10-4: Add workflow-mode context build command

```sdd-task
id: PHASE6.10-4
status: completed
wave: 3
depends_on:
  - PHASE6.10-2
  - PHASE6.10-3
acceptance_refs:
  - AC-5
plan_refs:
  - "§6 Context Build Packages"
affected_files:
  - packages/core/src/context/build-package.ts
  - packages/cli/src/main.ts
  - packages/core/src/context/context-build.test.ts
validation:
  - npm run typecheck
  - npm test -- --test-name-pattern "context build"
  - node ./dist/packages/cli/src/main.js context build --task PHASE6.10-4 --branch master --mode verify --json
risk:
  - context_underfetch
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.10-4.md
  - artifacts/review-PHASE6.10-4.md
  - artifacts/validation-PHASE6.10-4.md
verification_availability:
  - inspect:packages/core/src/context/build-package.ts
  - inspect:packages/cli/src/main.ts
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Implement `sdd context build --task <id> --mode do|verify|sync-back|doctor`.
- Emit must-read, optional, deferred refs and next commands.

Forbidden scope:

- Do not use context package as workflow authority.

#### Acceptance

- AC-5: Each mode produces deterministic minimal working sets.

#### Implementation Notes

- Sync-back applied from run `20260512-012` (2026-05-12T13:05:17.417Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.10-4.md`, `artifacts/validation-PHASE6.10-4.md`, `artifacts/acceptance-coverage-PHASE6.10-4.md`.

### PHASE6.10-5: Add agent-specific context packages

```sdd-task
id: PHASE6.10-5
status: completed
wave: 3
depends_on:
  - PHASE6.10-4
acceptance_refs:
  - AC-6
plan_refs:
  - "§6 Context Build Packages"
affected_files:
  - packages/core/src/context/build-package.ts
  - packages/cli/src/main.ts
  - packages/core/src/context/context-build.test.ts
validation:
  - npm run typecheck
  - npm test -- --test-name-pattern "agent context package"
  - node ./dist/packages/cli/src/main.js context build --task PHASE6.10-5 --branch master --mode verify --agent validator --json
risk:
  - agent_context_overfetch
  - agent_context_underfetch
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.10-5.md
  - artifacts/review-PHASE6.10-5.md
  - artifacts/validation-PHASE6.10-5.md
verification_availability:
  - inspect:packages/core/src/context/build-package.ts
  - inspect:packages/cli/src/main.ts
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Tailor package contents for implementer/reviewer/validator.
- Keep source refs expandable and non-authoritative.

Forbidden scope:

- Do not let an agent package grant self-pass authority.

#### Acceptance

- AC-6: Agent packages differ by role and remain derived guidance only.

#### Implementation Notes

- Sync-back applied from run `20260512-013` (2026-05-12T13:06:25.469Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.10-5.md`, `artifacts/validation-PHASE6.10-5.md`, `artifacts/acceptance-coverage-PHASE6.10-5.md`.

### PHASE6.10-6: Add non-authoritative log worker boundary

```sdd-task
id: PHASE6.10-6
status: completed
wave: 4
depends_on:
  - PHASE6.10-3
acceptance_refs:
  - AC-7
  - AC-8
plan_refs:
  - "§7 Log Worker Boundary and Trust Guard"
affected_files:
  - packages/core/src/context/log-worker.ts
  - packages/core/src/context/context-build.test.ts
validation:
  - npm run typecheck
  - npm test -- --test-name-pattern "log worker|non-authoritative"
risk:
  - subagent_authority_leak
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.10-6.md
  - artifacts/review-PHASE6.10-6.md
  - artifacts/validation-PHASE6.10-6.md
verification_availability:
  - inspect:packages/core/src/context/log-worker.ts
  - inspect:packages/core/src/context/context-build.test.ts
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Define log worker summary records and validation.
- Doctor/test flags any worker summary that claims authority.

Forbidden scope:

- Do not route workflow decisions through subagents/log workers.

#### Acceptance

- AC-7/AC-8: Worker summaries can help context only and cannot satisfy PASS evidence.

#### Implementation Notes

- Sync-back applied from run `20260512-014` (2026-05-12T13:07:46.071Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.10-6.md`, `artifacts/validation-PHASE6.10-6.md`, `artifacts/acceptance-coverage-PHASE6.10-6.md`.

### PHASE6.10-7: Add output budget regression tests

```sdd-task
id: PHASE6.10-7
status: completed
wave: 5
depends_on:
  - PHASE6.10-2
  - PHASE6.10-4
acceptance_refs:
  - AC-9
plan_refs:
  - "§8 Validation and Installed CLI Proof"
affected_files:
  - packages/core/src/context/context-build.test.ts
  - packages/cli/src/main.ts
validation:
  - npm run typecheck
  - npm test -- --test-name-pattern "budget"
risk:
  - output_budget_regression
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.10-7.md
  - artifacts/review-PHASE6.10-7.md
  - artifacts/validation-PHASE6.10-7.md
verification_availability:
  - inspect:packages/core/src/context/context-build.test.ts
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Add tests that prevent brief outputs/context packages from expanding unexpectedly.

Forbidden scope:

- Do not optimize by dropping blockers, failures, or next action.

#### Acceptance

- AC-9: Budget tests preserve compact output and critical facts.

#### Implementation Notes

- Sync-back applied from run `20260512-015` (2026-05-12T13:08:49.993Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.10-7.md`, `artifacts/validation-PHASE6.10-7.md`, `artifacts/acceptance-coverage-PHASE6.10-7.md`.

### PHASE6.10-8: Validate installed CLI workflow

```sdd-task
id: PHASE6.10-8
status: completed
wave: 5
depends_on:
  - PHASE6.10-6
  - PHASE6.10-7
acceptance_refs:
  - AC-10
plan_refs:
  - "§8 Validation and Installed CLI Proof"
affected_files:
  - specs/master/phase6.10-validation.md
  - packages/core/src/context/context-build.test.ts
  - packages/cli/src/main.ts
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - npm pack --dry-run --json
  - npm pack
  - npm install -g .\sdd-agent-platform-0.2.0.tgz
  - sdd --version
  - sdd status --branch master --compact-json
  - sdd context build --task PHASE6.10-8 --branch master --mode verify --json
  - sdd tasks inspect PHASE6.10-8 --branch master --json
  - sdd tasks route PHASE6.10-8 --branch master --json
  - sdd doctor --latest-only --branch master
risk:
  - package_install_regression
  - installed_cli_drift
agent_fit:
  - implementer
  - reviewer
  - validator
allowed_agents:
  - implementer
  - reviewer
  - validator
required_artifacts:
  - artifacts/implement-PHASE6.10-8.md
  - artifacts/review-PHASE6.10-8.md
  - artifacts/validation-PHASE6.10-8.md
verification_availability:
  - inspect:specs/master/phase6.10-validation.md
  - inspect:npm test
  - inspect:npm pack --dry-run --json
autonomy: direct_execution_allowed
```

#### Boundary

Allowed scope:

- Run full validation and installed CLI smoke from current tarball.
- Record validation evidence in the run.

Forbidden scope:

- Do not publish npm, push, commit, reset, clean, or apply sync-back without explicit approval.

#### Acceptance

- AC-10: Built and installed CLI proves Phase 6.10 behavior end-to-end.

#### Implementation Notes

- Sync-back applied from run `20260512-016` (2026-05-12T13:12:29.610Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.10-8.md`, `artifacts/validation-PHASE6.10-8.md`, `artifacts/acceptance-coverage-PHASE6.10-8.md`.
- Sync-back applied from run `20260513-001` (2026-05-13T05:59:58.505Z); proposal: `artifacts/sync-back-proposal.md`; artifacts: `artifacts/review-PHASE6.10-8.md`, `artifacts/validation-PHASE6.10-8.md`, `artifacts/acceptance-coverage-PHASE6.10-8.md`.