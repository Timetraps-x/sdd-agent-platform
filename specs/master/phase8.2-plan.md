# Phase 8.2 Plan — Risk Workflow Enforcement and Human-Readable Gates

## 1. Implementation strategy

Phase 8.2 should be implemented as a narrow workflow correctness slice. The priority is to make route/test/sync-back/ship agree on lifecycle gates, then make the user-facing output understandable.

Recommended order:

1. Calibrate the risk taxonomy and gate precedence in `phase8.2-risk-taxonomy-research.md`.
2. Define a shared lifecycle gate vocabulary for user-facing decisions:
   - `direct`
   - `review-before-sync-back`
   - `review-before-test`
   - `approval-before-test`
   - `research-before-implementation`
   - `clarify-before-routing`
   - `verify-contract-blocked`
3. Map current task/risk taxonomy to those gates.
4. Make route decisions expose gate/profile/approval/stages/reason/nextAction for allowed and blocked cases.
5. Make `/sdd:test` honor the same pre-test gate before validation command execution.
6. Keep task-scoped sync-back apply decisions separate from branch/global diagnostics.
7. Add concise human-readable renderers for route/test/sync-back/ship/lifecycle/doctor gate states.
8. Run full installed-project risk matrix validation and write the final report.

## 2. Expected runtime flow

### Route

```text
parse branch/task
inspect task gaps
compute lifecycle risk decision
map decision to workflow gate
return:
  allowed/blocked
  lifecycleGate
  lifecycleProfile
  approvalPolicy
  requiredStages
  primaryReason
  nextAction
render concise default output
```

### Test

```text
parse branch/task
ensure verify.md is present/fresh when needed
if verify contract BLOCKED:
  return verify-contract-blocked without command execution
compute task lifecycle gate
if gate blocks pre-test:
  return blocked without command execution
run validation command only after verifies and lifecycle gate permit it
write evidence and test index
return sync-back next action when ready
```

### Sync-back

```text
inspect selected run/task
use task-scoped lifecycle gate for apply readiness
keep branch/global lifecycle diagnostic visible as context
apply direct only when task gate and evidence permit it
require confirmation/review for gated risky changes
```

### Ship

```text
inspect branch/global lifecycle, run, doctor, release readiness
remain conservative
render one primary blocking reason by default
preserve full blockedChecks in JSON/verbose
```

## 3. Likely files to change

Risk and lifecycle policy:

- `packages/core/src/risk/kernel.ts`
- `packages/core/src/risk/legacy-adapters.ts`
- `packages/core/src/lifecycle/decision-gate.ts`
- `packages/core/src/orchestration/runtime.ts`
- `packages/core/src/stage-runtime/runtime.ts`

Route/test/sync-back/ship behavior:

- `packages/core/src/router/routing.ts`
- `packages/core/src/verification/test-runtime.ts`
- `packages/core/src/sync-back/inspect.ts`
- `packages/core/src/lifecycle/ship.ts`
- `packages/core/src/status/project-status.ts`

CLI/renderers:

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/test.ts`
- `packages/cli/src/commands/sync-back.ts`
- `packages/cli/src/commands/ship.ts`
- `packages/cli/src/commands/lifecycle.ts`
- `packages/cli/src/commands/doctor.ts`
- `packages/cli/src/renderers/router.ts`
- `packages/cli/src/renderers/workflow.ts`
- `packages/cli/src/renderers/doctor.ts`

Tests:

- `packages/core/src/router/route-sdd-task.test.ts`
- `packages/core/src/verification/test-runtime.test.ts`
- `packages/core/src/sync-back/sync-back.test.ts`
- `packages/core/src/lifecycle/ship.test.ts`
- `packages/core/src/status/project-status.test.ts`
- focused lifecycle/risk kernel tests as needed

Docs/evidence:

- `specs/master/phase8.2-*`
- `specs/master/phase8.2-risk-workflow-matrix-report.md` after real validation
- `specs/master/phase8.2-risk-taxonomy-research.md` before implementation

## 4. Risk policy details to settle in implementation

### Calibration checkpoint

Implementation must start from `phase8.2-risk-taxonomy-research.md`. The checkpoint fixes: canonical risk family names, synonym normalization, gate vocabulary, strictest-gate precedence, and the external preview/review/apply precedent used for the user interaction model.

### Pre-test gate classes

The implementation should start with the conservative interpretation from Phase 8.1 findings:

- `database`, `data-loss`, `security`, and `token/secret` require approval-before-test.
- `source-boundary`, `runtime-state`, `api-schema`, `state-machine`, `concurrency`, and `ci-build` require at least review-before-test unless paired with direct-safe metadata that narrows the blast radius.
- `external-unknown` should route to research-before-implementation when impact confidence is low or validation is unclear; otherwise approval-before-test is acceptable if the user explicitly approves risk.
- `unknown` should route to clarify-before-routing, not generic approval.
- `validation-only`, `context-risk`, `token-risk`, and `performance` default to review-before-sync-back unless combined with a stricter risk.

### Gate precedence

When multiple risks are present, use the strictest gate:

```text
verify-contract-blocked
clarify-before-routing
research-before-implementation
approval-before-test
review-before-test
review-before-sync-back
direct
```

`verify-contract-blocked` is scoped to `/sdd:test`; route may still report the lifecycle gate if the task itself is routable.

### Dynamic lifecycle and agent/team behavior

Risk/lifecycle may change when task metadata, affected files, verify contract freshness, external confidence, or validation clarity changes. Agent/team recommendations may also change. The user-facing gate is the stable explanation layer; internal profile/team choices are secondary diagnostics.

## 5. Human-readable renderer shape

Default route output example:

```text
SDD route DATABASE

Blocked before validation.

Why:
- Database/data-loss changes require approval before commands run.

Next:
- Review and approve lifecycle risk for DATABASE, then rerun with approval.
```

Default test output example:

```text
SDD test CONTEXT

Validation passed; sync-back needs review.

Why:
- Context/token-budget risk is safe to validate but should not auto-apply task status.

Next:
- Inspect sync-back proposal before applying.
```

Default direct output example:

```text
SDD test DIRECT

Validation passed and sync-back is ready.

Why:
- No high-risk lifecycle gate applies to this task.

Next:
- Inspect or apply sync-back for DIRECT.
```

JSON must retain full details for automation and reports.

## 6. Validation plan

Focused tests:

```powershell
node --test --import tsx packages/core/src/router/route-sdd-task.test.ts
node --test --import tsx packages/core/src/verification/test-runtime.test.ts
node --test --import tsx packages/core/src/sync-back/sync-back.test.ts
node --test --import tsx packages/core/src/lifecycle/ship.test.ts packages/core/src/status/project-status.test.ts
```

Broader checks:

```powershell
npm run typecheck
npm test
npm run build
npm pack --dry-run --json
```

Real installed-project validation:

```powershell
npm pack --pack-destination <temp>/pkg --json
npm init -y
npm install <temp>/pkg/sdd-agent-platform-0.4.0.tgz
node_modules/.bin/sdd.cmd init --json
node_modules/.bin/sdd.cmd tasks route <task> --branch risk-matrix --json
node_modules/.bin/sdd.cmd test task <task> --branch risk-matrix --command "node --version" --json
node_modules/.bin/sdd.cmd sync-back inspect <run> --branch risk-matrix --task <task> --json
node_modules/.bin/sdd.cmd ship --dry-run --branch risk-matrix --json
```

The final report must compare expected versus observed behavior for every risk family.

## 7. Non-goals

- No code graph implementation.
- No public package publish.
- No force-push, tag, release, or remote mutation.
- No broad runtime storage rewrite.
- No subagent final authority.
