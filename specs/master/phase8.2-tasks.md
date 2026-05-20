# Phase 8.2 Tasks — Risk Workflow Enforcement and Human-Readable Gates

## PHASE8.2-0 — Calibrate risk taxonomy and gate precedence

```sdd-task
id: PHASE8.2-0
status: completed
wave: 0
depends_on: []
acceptance_refs:
  - AC-0
affected_files:
  - specs/master/phase8.2-risk-taxonomy-research.md
  - specs/master/phase8.2-spec.md
  - specs/master/phase8.2-plan.md
  - specs/master/phase8.2-tasks.md
  - specs/master/phase8.2-validation.md
validation:
  - manual research review
risk:
  - workflow
  - validation-only
allowed_agents:
  - researcher
  - validator
```

### Acceptance

- Current internal risk sources are mapped and naming drift is recorded.
- External CLI precedents are summarized only where they affect gate design.
- Canonical risk families, synonym normalization, and strictest-gate precedence are fixed before implementation.

## PHASE8.2-1 — Define lifecycle gate policy

```sdd-task
id: PHASE8.2-1
status: completed
wave: 1
depends_on:
  - PHASE8.2-0
acceptance_refs:
  - AC-1
  - AC-7
affected_files:
  - packages/core/src/risk/kernel.ts
  - packages/core/src/risk/legacy-adapters.ts
  - packages/core/src/lifecycle/decision-gate.ts
validation:
  - node --test --import tsx packages/core/src/phase8-risk-kernel.test.ts packages/core/src/phase8-projection-compat.test.ts
risk:
  - workflow
  - source-boundary
allowed_agents:
  - implementer
  - validator
```

### Acceptance

- Every current risk family maps to one explicit lifecycle gate.
- Unknown/blocked and external-unknown semantics are separated.
- Multiple risk tags resolve to the strictest applicable gate.

## PHASE8.2-2 — Expose route lifecycle gates

```sdd-task
id: PHASE8.2-2
status: completed
wave: 1
depends_on:
  - PHASE8.2-1
acceptance_refs:
  - AC-4
affected_files:
  - packages/core/src/router/routing.ts
  - packages/core/src/router/route-sdd-task.test.ts
validation:
  - node --test --import tsx packages/core/src/router/route-sdd-task.test.ts
risk:
  - workflow
  - api-schema
allowed_agents:
  - implementer
  - validator
```

### Acceptance

- Route JSON includes lifecycle gate, profile, approval policy, required stages, primary reason, and next action for allowed and blocked risky routes.
- Default next action distinguishes task gaps, lifecycle approval, research, and clarification.
- Internal profile/team-mode details remain available but are not the only explanation.

## PHASE8.2-3 — Enforce pre-test lifecycle gates

```sdd-task
id: PHASE8.2-3
status: completed
wave: 2
depends_on:
  - PHASE8.2-1
  - PHASE8.2-2
acceptance_refs:
  - AC-2
  - AC-3
affected_files:
  - packages/core/src/verification/test-runtime.ts
  - packages/core/src/verification/test-runtime.test.ts
validation:
  - node --test --import tsx packages/core/src/verification/test-runtime.test.ts
risk:
  - workflow
  - evidence
allowed_agents:
  - implementer
  - validator
```

### Acceptance

- `/sdd:test` does not execute validation commands for review-before-test, approval-before-test, research-before-implementation, clarify-before-routing, or verify-contract-blocked cases.
- Direct low-risk tasks still execute commands and can reach direct sync-back readiness.
- The result records a human-readable primary reason and next action.

## PHASE8.2-4 — Align sync-back, ship, and status diagnostics

```sdd-task
id: PHASE8.2-4
status: completed
wave: 2
depends_on:
  - PHASE8.2-3
acceptance_refs:
  - AC-3
  - AC-4
affected_files:
  - packages/core/src/sync-back/inspect.ts
  - packages/core/src/lifecycle/ship.ts
  - packages/core/src/status/project-status.ts
  - packages/core/src/sync-back/sync-back.test.ts
  - packages/core/src/lifecycle/ship.test.ts
  - packages/core/src/status/project-status.test.ts
validation:
  - node --test --import tsx packages/core/src/sync-back/sync-back.test.ts packages/core/src/lifecycle/ship.test.ts packages/core/src/status/project-status.test.ts
risk:
  - workflow
  - runtime-state
allowed_agents:
  - implementer
  - validator
```

### Acceptance

- Task-scoped sync-back does not inherit unrelated branch/global blockers as task apply blockers.
- Branch/global diagnostics remain visible for status and ship.
- Ship remains conservative for unresolved high-risk branch state.

## PHASE8.2-5 — Add concise human-readable gate renderers

```sdd-task
id: PHASE8.2-5
status: completed
wave: 3
depends_on:
  - PHASE8.2-2
  - PHASE8.2-3
  - PHASE8.2-4
acceptance_refs:
  - AC-5
  - AC-6
affected_files:
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/test.ts
  - packages/cli/src/commands/sync-back.ts
  - packages/cli/src/commands/ship.ts
  - packages/cli/src/commands/lifecycle.ts
  - packages/cli/src/commands/doctor.ts
  - packages/cli/src/renderers/router.ts
  - packages/cli/src/renderers/workflow.ts
  - packages/cli/src/renderers/doctor.ts
validation:
  - node --test --import tsx packages/cli/src/**/*.test.ts
risk:
  - workflow
  - output-quality
allowed_agents:
  - implementer
  - reviewer
  - validator
```

### Acceptance

- Default route/test/sync-back/ship/lifecycle/doctor gate output follows `result / Why / Next`.
- Blocked output always explains why and gives one next safe action.
- `--json` and `--verbose` preserve full diagnostics.

## PHASE8.2-6 — Run full installed risk and agent-boundary validation

```sdd-task
id: PHASE8.2-6
status: completed
wave: 4
depends_on:
  - PHASE8.2-5
acceptance_refs:
  - AC-8
  - AC-9
affected_files:
  - specs/master/phase8.2-validation.md
  - specs/master/phase8.2-risk-workflow-matrix-report.md
validation:
  - npm run typecheck
  - npm test
  - npm run build
  - npm pack --dry-run --json
  - installed-project full risk matrix
risk:
  - workflow
  - validation-only
allowed_agents:
  - validator
  - goal-verifier
```

### Acceptance

- Real installed-project validation reruns every current risk family.
- The report includes route result, test result, sync-back result, ship behavior, expected gate, observed gate, and judgment.
- Agent/subagent authority checks prove subagents do not close lifecycle gates or bypass approvals.
