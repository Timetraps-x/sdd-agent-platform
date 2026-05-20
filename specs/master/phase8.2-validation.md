# Phase 8.2 Validation — Risk Workflow Enforcement and Human-Readable Gates

## Status

PASS — implementation is complete, focused regression tests passed, full project checks passed, and the installed-project risk matrix rerun matched all current risk families.

## Required validation layers

### 0. Risk taxonomy calibration review

Before implementation validation, review:

```text
specs/master/phase8.2-risk-taxonomy-research.md
```

Expected coverage:

- internal risk sources and naming drift are recorded.
- external preview/review/apply precedents are summarized.
- canonical risk families and synonym normalization are explicit.
- strictest-gate precedence is documented.

### 1. Focused regression tests

Run the narrow tests that prove each lifecycle surface agrees on gate semantics:

```powershell
node --test --import tsx packages/core/src/router/route-sdd-task.test.ts
node --test --import tsx packages/core/src/verification/test-runtime.test.ts
node --test --import tsx packages/core/src/sync-back/sync-back.test.ts
node --test --import tsx packages/core/src/lifecycle/ship.test.ts packages/core/src/status/project-status.test.ts
```

Expected coverage:

- route returns lifecycle gate details for allowed and blocked tasks.
- `/sdd:test` does not execute commands before required review/approval/research/clarification gates.
- direct tasks remain lightweight and sync-back ready after PASS.
- sync-back task scope does not inherit unrelated branch/global blockers.
- ship remains branch/global conservative.

### 2. Full project checks

```powershell
npm run typecheck
npm test
npm run build
npm pack --dry-run --json
```

These checks prove source correctness and package readiness, but they are not sufficient by themselves.

### 3. Installed-project risk matrix

Run an installed tarball in a temporary project and exercise the full current risk taxonomy:

| Task | Risk family | Expected gate |
|---|---|---|
| `DIRECT` | direct low-risk | direct |
| `VALIDATION_ONLY` | validation/evidence-only | review-before-sync-back |
| `SOURCE_BOUNDARY` | source boundary | review-before-test or approval-before-test |
| `RUNTIME_STATE` | runtime state boundary | review-before-test or approval-before-test |
| `SECURITY` | security | approval-before-test |
| `TOKEN_SECRET` | token/secret | approval-before-test |
| `TOKEN_CONTEXT` | token/context budget | review-before-sync-back |
| `CONTEXT` | context budget | review-before-sync-back |
| `PERFORMANCE` | performance | review-before-sync-back unless escalated |
| `EXTERNAL` | external unknown | research-before-implementation or approval-before-test |
| `API_SCHEMA` | API/schema contract | review-before-test or approval-before-test |
| `DATABASE` | database/data-loss | approval-before-test |
| `STATE_CONCURRENCY` | state/concurrency | review-before-test or approval-before-test |
| `CI_BUILD` | CI/build/release | review-before-test or approval-before-test |
| `BLOCKED_UNKNOWN` | unknown/blocked | clarify-before-routing |

For each task, record:

- route exit code and lifecycle gate.
- route default human output: result, Why, Next.
- test exit code and whether the validation command ran.
- test default human output: result, Why, Next.
- sync-back readiness and apply policy when a run exists.
- ship dry-run status at branch level.
- expected versus observed judgment.

### 4. Agent/subagent authority validation

Installed validation must include at least these authority checks:

- `verification-designer` remains independent from `task-planner` and `implementer` in generated `verify.md`.
- `implementer` cannot authoritatively verify its own work.
- goal verification remains separate from command execution evidence.
- subagent/research evidence may inform decisions but does not approve high-risk execution.
- sync-back and ship remain main workflow authority decisions.

### 5. Human-readable interaction validation

For blocked cases, confirm the default terminal output answers:

```text
What happened?
Why did it block?
What should I do next?
```

The default output should not require the user to understand:

- `implementer`
- `review-lite`
- `hyperplan`
- lifecycle projection scope keys
- runtime SQLite table names
- internal adapter names

Verbose and JSON output must preserve those details where they are useful for diagnostics.

## Required report

Completion requires a new analyzable report:

```text
specs/master/phase8.2-risk-workflow-matrix-report.md
```

The report must include:

- validation environment.
- taxonomy calibration summary and any deviations from `phase8.2-risk-taxonomy-research.md`.
- risk taxonomy and task setup.
- command transcript.
- expected gate matrix.
- observed route/test/sync-back/ship matrix.
- user-facing output samples for at least one direct, one review-before-sync-back, one approval-before-test, one research/clarify, and one verify-blocked case.
- findings and any follow-up gaps.

## Completion rule

Phase 8.2 can be marked PASS only when:

- risk taxonomy calibration review is complete.
- focused tests pass.
- full typecheck/test/build/package checks pass.
- full installed-project matrix matches expected gates or documents an intentionally accepted policy exception.
- blocked outputs are human-readable and actionable.
- no validation command executes before a pre-test gate that should block it.
