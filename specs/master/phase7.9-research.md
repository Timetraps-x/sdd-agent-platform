# Phase 7.9 Research — Workflow Semantics, Risk, Context and Token Runtime Hardening

## Research question

Phase 7.0 established modular runtime/package boundaries, and Phase 7.1–7.8 built runtime storage, workflow state, verify/test evidence, agent capability catalogs, command-scoped team runtime, sync-back, ship, and statusline surfaces. Three real E2E cases proved the main lifecycle can run end to end, but they also showed the workflow can still pass with weak semantics.

Phase 7.9 answers this question:

```text
How do we turn the Phase 7 workflow from "can complete" into "semantically trustworthy, risk-consistent, scope-safe, and context/token-aware" before Phase 8 adds code graph intelligence?
```

## Evidence reviewed

### Phase 7.0 regression data

- `npm run typecheck` passed after Phase 7.1–7.8.
- `npm test` passed 187/187.
- `npm pack --dry-run --json` passed.
- CLI boundary grep found no `../../core/src`, `../../../core/src`, or root `@sdd-agent-platform/core` imports under `packages/cli/src`.

Conclusion: Phase 7.1–7.8 did not break the Phase 7.0 modular runtime/package boundary main path.

### Real E2E case 1: `phase7-e2e`

- Partition: `phase7-e2e`.
- Task: `PHASE7E2E-1`.
- Run: `20260516-005`.
- Test command: `node --version`.
- Final state: task completed, run completed, validation pass, sync-back applied, doctor fast PASS, ship PASS.

Findings:

- `sdd do task --help` created runtime state instead of rendering help.
- `sdd run create --branch --task` produced an unscoped run.
- `artifact template --run` required explicit `--branch` to avoid unscoped evidence paths.
- `sdd-task` fenced blocks and `acceptance_refs` are essential for machine-readable tasks and stable verify targets.
- sync-back apply changes `tasks.md`, making `verify.md` stale until `verifies write --force` refreshes the hash.
- terminal delegations cannot be re-ingested in the same run after artifact semantic changes.
- `sdd test task` overwrites the validator artifact.

### Real E2E case 2: `phase7-e2e-readiness`

- Partition: `phase7-e2e-readiness`.
- Task: `PHASE7E2ER-1`.
- Run: `20260516-006`.
- Test command: `npm run sdd -- statusline --branch phase7-e2e-readiness --compact-json`.
- Final state: task completed, run completed, validation pass, sync-back applied, doctor fast PASS, ship PASS.

Findings:

- artifact template works when run and branch scope are both explicit.
- sync-back apply again made verify stale until the verify contract was refreshed.
- a single readiness command generated PASS evidence for AC-1 through AC-8, showing blanket acceptance mapping.

### Real E2E case 3: `phase7-e2e-hardening`

- Partition: `phase7-e2e-hardening`.
- Task: `PHASE7E2EH-1`.
- Run: `20260516-007`.
- Test command: intended `node --eval ...`, then successful `npm --version` due PowerShell quoting.
- Final state: task completed, run completed, validation pass, sync-back applied, doctor fast PASS, ship PASS.

Findings:

- A task declaring `high-risk`, `source-boundary`, `platform-runtime`, `evidence-semantics`, and `multi-agent-review` was routed as low-risk with `team_mode=disabled` and reason `Low-risk task does not need an agent team`.
- `sync-back inspect` did recognize the same risk tags and required approval, proving risk policy is duplicated/inconsistent across router/team-mode and sync-back.
- `npm --version` produced PASS evidence for AC-1 through AC-8, confirming blanket acceptance mapping.
- `verify task` reported planned task validation command in the summary while the actual ledger-backed evidence referenced `npm --version`, mixing planned and executed command sources.
- PowerShell nested quoting broke `--command "node --eval ..."`.

## Current implementation reality

### Context optimization

Implemented as structure, not runtime enforcement:

- `ContextBudget` profiles exist: `brief`, `normal`, `forensic`.
- `ContextBuildPackage` exists with `mustRead`, `optionalRead`, and `doNotReadUnlessNeeded` refs.
- Context packages are explicitly non-authoritative and unusable for PASS evidence.
- Project context pack inspect/validate exists.
- Agent capability catalogs include material packs, load policy, trigger stages, and context budget metadata.
- Command team runtime profiles include context budget and material policy metadata.

Missing:

- budget enforcement;
- materialized summaries/excerpts by budget;
- included/excluded/deferred accounting;
- role-scoped context packages;
- context pressure gates;
- runtime projections used by statusline/doctor/ship.

### Token optimization

Implemented mostly as metadata/placeholders:

- `tokenHealth` exists in statusline projection, but E2E reports `tokens=unknown`.
- `token_risk` exists as a capability/routing concept.
- command/team runtime has `tokenEstimatePolicy: estimated_only` metadata.

Missing:

- token estimate model;
- token pressure calculation;
- budget enforcement;
- subagent/team token cost estimates;
- token-aware team activation;
- plan-stage performance/token reports;
- doctor/statusline projections based on real estimates.

## Root causes

1. Command side-effect lifecycle is not centralized.
2. Risk signals are parsed and consumed inconsistently by router/team-mode and sync-back.
3. Run scope and artifact scope are not a single runtime model.
4. Test runtime maps command success to all task acceptance refs instead of explicit AC-level coverage.
5. Verification reporting does not separate planned validation commands from executed ledger commands.
6. Context and token support is declarative, not enforced at runtime.
7. E2E coverage proves the happy path, but not negative/partial coverage, active team-mode, or shell-safe command execution.

## Decision

Phase 7.9 must not be a minimal bugfix phase. It should be a semantic hardening phase with these platform contracts:

- `CommandLifecycleContract`
- `TaskRiskProfileContract`
- `RunScopeContract`
- `EvidenceCoverageContract`
- `VerificationSelectionContract`
- `TestCommandExecutionContract`
- `SyncBackConsistencyContract`
- `ContextTokenRuntimeContract`

## Phase 7.9 handoff

Phase 7.9 should complete before Phase 8 because Phase 8 code graph intelligence will depend on accurate source-boundary risk, affected-file classification, evidence coverage, context selection, and token pressure signals. Without Phase 7.9, graph intelligence would amplify unreliable PASS semantics and inconsistent risk routing.
