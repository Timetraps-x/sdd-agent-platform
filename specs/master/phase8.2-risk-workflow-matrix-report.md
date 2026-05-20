# Phase 8.2 Risk Workflow Matrix Report

## 1. Validation environment

- Project: `sdd-agent-platform`
- Package version under validation: `0.4.0`
- Platform: Windows 11 / PowerShell / Node.js runtime for the installed package CLI
- Installed-project validation root: `C:\Users\inshn\AppData\Local\Temp\sdd-phase82-matrix-3dc2031d4e21447abbe18462c7bd7a5f\project`
- Package root used by installed validation: `C:\Users\inshn\AppData\Local\Temp\sdd-phase82-matrix-3dc2031d4e21447abbe18462c7bd7a5f`
- Installed CLI entry used by the matrix runner: `node_modules/sdd-agent-platform/packages/cli/dist/main.js`

## 2. Taxonomy calibration summary

Phase 8.2 uses the calibrated taxonomy from `specs/master/phase8.2-risk-taxonomy-research.md` and maps task risk to a user-facing lifecycle gate before route/test/sync-back decisions are rendered.

Strictest gate precedence:

1. `verify-contract-blocked`
2. `clarify-before-routing`
3. `research-before-implementation`
4. `approval-before-test`
5. `review-before-test`
6. `review-before-sync-back`
7. `direct`

Canonical mapping used by validation:

| Risk family | Expected lifecycle gate |
|---|---|
| direct low-risk | `direct` |
| validation/evidence-only | `review-before-sync-back` |
| source boundary | `review-before-test` |
| runtime state boundary | `review-before-test` |
| security | `approval-before-test` |
| token/secret | `approval-before-test` |
| token/context budget | `review-before-sync-back` |
| context budget | `review-before-sync-back` |
| performance/cost/latency | `review-before-sync-back` |
| external unknown | `research-before-implementation` |
| API/schema contract | `review-before-test` |
| database/data-loss | `approval-before-test` |
| state-machine/concurrency | `review-before-test` |
| CI/build/release | `review-before-test` |
| unknown/blocked | `clarify-before-routing` |

Important taxonomy decisions validated:

- `unknown` / `blocked-unknown` is clarification work, not research work.
- `external` / `third-party` / `external-unknown` requires research before implementation.
- token/secret material requires human approval before validation.
- token budget/context risk stays lightweight enough to validate, but sync-back requires review.
- source/runtime/API/schema/state/concurrency/CI/build/release changes require a pre-test review checkpoint.
- database/data-loss/security/token/secret risks require human approval before validation.

## 3. Implementation deviations discovered during validation

The installed matrix initially exposed one policy gap:

- `API_SCHEMA` was expected to gate as `review-before-test`, but `api/openapi.yaml` was classified as `direct`.
- Root cause: API schema paths were classified as `unknown` and did not derive an `api-schema` risk tag.
- Fix: added `api-schema` file classification for `api/*.(yaml|yml|json)` and `openapi|swagger.(yaml|yml|json)`, and derived the `api-schema` risk tag from that file class.
- Result after fix: installed matrix passed `15/15` expected lifecycle gate judgments.

No accepted policy exception remains.

## 4. Command transcript

Focused regression tests:

```powershell
node --test --import tsx packages/core/src/router/route-sdd-task.test.ts
node --test --import tsx packages/core/src/verification/test-runtime.test.ts
node --test --import tsx packages/core/src/sync-back/sync-back.test.ts
node --test --import tsx packages/core/src/lifecycle/ship.test.ts packages/core/src/status/project-status.test.ts
```

Additional regression coverage run during implementation:

```powershell
node --test --import tsx packages/cli/src/commands/cli-regression.test.ts
node --test --import tsx packages/cli/src/renderers/doctor.test.ts
node --test --import tsx packages/core/src/lifecycle/decision-gate.test.ts
node --test --import tsx packages/core/src/phase8-risk-kernel.test.ts packages/core/src/router/route-sdd-task.test.ts packages/core/src/verification/test-runtime.test.ts
```

Full project checks:

```powershell
npm run typecheck
npm test
npm run build
npm pack --dry-run --json
```

Installed-project matrix actions:

```text
For each risk-family task:
1. sdd tasks route <TASK> --branch risk-matrix --json
2. sdd test task <TASK> --branch risk-matrix --json
3. inspect command ledger to determine whether validation commands ran
4. sdd sync-back inspect <run> --branch risk-matrix --task <TASK> --json when a run exists
5. sdd ship --dry-run --branch risk-matrix --json at branch scope
```

Final observed result:

```text
Focused regression tests: PASS
npm run typecheck: PASS
npm test: PASS
npm run build: PASS
npm pack --dry-run --json: PASS
Installed-project risk matrix: 15/15 MATCH
```

## 5. Installed-project observed matrix

| Task | Risk family | Expected gate | Route gate | Test gate | Test status | Command ran | Sync-back | Ship dry-run | Judgment |
|---|---|---|---|---|---|---:|---|---|---|
| `DIRECT` | direct low-risk | `direct` | `direct` | `direct` | `PASS` | yes | `ready`, policy `direct` | `BLOCKED` branch/global | `MATCH` |
| `VALIDATION_ONLY` | validation/evidence-only | `review-before-sync-back` | `review-before-sync-back` | `review-before-sync-back` | `PASS` | yes | `ready`, policy `confirm` | `BLOCKED` branch/global | `MATCH` |
| `SOURCE_BOUNDARY` | source boundary | `review-before-test` | `review-before-test` | `review-before-test` | `BLOCKED` | no | no run | `BLOCKED` branch/global | `MATCH` |
| `RUNTIME_STATE` | runtime state boundary | `review-before-test` | `review-before-test` | `review-before-test` | `BLOCKED` | no | no run | `BLOCKED` branch/global | `MATCH` |
| `SECURITY` | security | `approval-before-test` | `approval-before-test` | `approval-before-test` | `BLOCKED` | no | no run | `BLOCKED` branch/global | `MATCH` |
| `TOKEN_SECRET` | token/secret | `approval-before-test` | `approval-before-test` | `approval-before-test` | `BLOCKED` | no | no run | `BLOCKED` branch/global | `MATCH` |
| `TOKEN_CONTEXT` | token/context budget | `review-before-sync-back` | `review-before-sync-back` | `review-before-sync-back` | `PASS` | yes | `ready`, policy `confirm` | `BLOCKED` branch/global | `MATCH` |
| `CONTEXT` | context budget | `review-before-sync-back` | `review-before-sync-back` | `review-before-sync-back` | `PASS` | yes | `ready`, policy `confirm` | `BLOCKED` branch/global | `MATCH` |
| `PERFORMANCE` | performance/cost/latency | `review-before-sync-back` | `review-before-sync-back` | `review-before-sync-back` | `PASS` | yes | `ready`, policy `confirm` | `BLOCKED` branch/global | `MATCH` |
| `EXTERNAL` | external unknown | `research-before-implementation` | `research-before-implementation` | `research-before-implementation` | `BLOCKED` | no | no run | `BLOCKED` branch/global | `MATCH` |
| `API_SCHEMA` | API/schema contract | `review-before-test` | `review-before-test` | `review-before-test` | `BLOCKED` | no | no run | `BLOCKED` branch/global | `MATCH` |
| `DATABASE` | database/data-loss | `approval-before-test` | `approval-before-test` | `approval-before-test` | `BLOCKED` | no | no run | `BLOCKED` branch/global | `MATCH` |
| `STATE_CONCURRENCY` | state-machine/concurrency | `review-before-test` | `review-before-test` | `review-before-test` | `BLOCKED` | no | no run | `BLOCKED` branch/global | `MATCH` |
| `CI_BUILD` | CI/build/release | `review-before-test` | `review-before-test` | `review-before-test` | `BLOCKED` | no | no run | `BLOCKED` branch/global | `MATCH` |
| `BLOCKED_UNKNOWN` | unknown/blocked | `clarify-before-routing` | `clarify-before-routing` | `clarify-before-routing` | `BLOCKED` | no | no run | `BLOCKED` branch/global | `MATCH` |

Ship dry-run is intentionally branch/global conservative. In the matrix branch it remained blocked because unresolved high-risk and blocked tasks still existed at branch scope. The first blocking check was:

```json
{
  "name": "doctor_fast",
  "status": "BLOCKED",
  "message": "doctor_status=FAIL",
  "nextAction": "sdd doctor fast --branch risk-matrix"
}
```

## 6. Command execution gate judgment

Validation commands ran only for gates that allow command execution:

- `direct`
- `review-before-sync-back`

Validation commands did not run for pre-test blockers:

- `review-before-test`
- `approval-before-test`
- `research-before-implementation`
- `clarify-before-routing`
- `verify-contract-blocked`

This satisfies the Phase 8.2 rule that `/sdd:test` must stop before executing commands when review, approval, research, clarification, or verify-contract repair is required.

## 7. Human-readable output samples

### Direct route

```text
SDD route DIRECT

Routed through the direct workflow.

Why:
- No high-risk lifecycle gate applies to DIRECT.

Next:
- Run validation for DIRECT; sync-back can be direct after PASS.
```

### Direct test

```text
SDD test DIRECT

Validation passed and sync-back is ready.

Why:
- No high-risk lifecycle gate applies to DIRECT.

Next:
- sdd sync-back inspect 20260519-016 --branch risk-matrix --task DIRECT
```

### Review-before-sync-back route

```text
SDD route VALIDATION_ONLY

Routed; validation can run and sync-back needs review.

Why:
- Task VALIDATION_ONLY can be validated, but validation/evidence-only work requires review before applying status.

Next:
- Run validation for VALIDATION_ONLY, then inspect the sync-back proposal before applying status.
```

### Review-before-sync-back test

```text
SDD test VALIDATION_ONLY

Validation passed; sync-back needs review.

Why:
- Task VALIDATION_ONLY can be validated, but validation/evidence-only work requires review before applying status.

Next:
- sdd sync-back inspect 20260519-017 --branch risk-matrix --task VALIDATION_ONLY
```

### Review-before-test route

```text
SDD route SOURCE_BOUNDARY

Routed with a lifecycle checkpoint.

Why:
- Task SOURCE_BOUNDARY touches source, runtime state, API/schema, state/concurrency, or CI/build boundaries.

Next:
- Have a reviewer inspect affected files and validation commands for SOURCE_BOUNDARY, record the checkpoint, then rerun sdd test task SOURCE_BOUNDARY.
```

### Review-before-test test

```text
SDD test SOURCE_BOUNDARY

Blocked before validation commands ran.

Why:
- Task SOURCE_BOUNDARY touches source, runtime state, API/schema, state/concurrency, or CI/build boundaries.

Next:
- Have a reviewer inspect affected files and validation commands for SOURCE_BOUNDARY, record the checkpoint, then rerun sdd test task SOURCE_BOUNDARY.
```

### Approval-before-test route

```text
SDD route DATABASE

Blocked before validation.

Why:
- Task DATABASE includes security, token/secret, database, data-loss, or similarly high-impact risk.

Next:
- Have a human review the risk, affected files, and validation commands; if accepted, rerun sdd test task DATABASE --approved.
```

### Approval-before-test test

```text
SDD test DATABASE

Blocked before validation commands ran.

Why:
- Task DATABASE includes security, token/secret, database, data-loss, or similarly high-impact risk.

Next:
- Have a human review the risk, affected files, and validation commands; if accepted, rerun sdd test task DATABASE --approved.
```

### Research-before-implementation route

```text
SDD route EXTERNAL

Blocked before implementation research is complete.

Why:
- Task EXTERNAL depends on external or low-confidence impact and needs research before implementation.

Next:
- Complete research for EXTERNAL, document impact and validation, then reroute.
```

### Research-before-implementation test

```text
SDD test EXTERNAL

Blocked before validation commands ran.

Why:
- Task EXTERNAL depends on external or low-confidence impact and needs research before implementation.

Next:
- Complete research for EXTERNAL, document impact and validation, then reroute.
```

### Verify-contract-blocked test

```text
SDD test VERIFY_BLOCKED

Blocked before validation commands ran.

Why:
- verify.md is missing, stale, or invalid, so validation commands cannot run for VERIFY_BLOCKED.

Next:
- Run sdd instructions verify --json, fix or refresh verify.md for VERIFY_BLOCKED, then rerun sdd test task VERIFY_BLOCKED.
```

## 8. Agent/subagent authority validation

Phase 8.2 preserves the agent and subagent authority boundary:

- `verification-designer` remains distinct from `task-planner` and `implementer` for `verify.md` generation.
- `implementer` is not allowed to authoritatively verify its own work.
- goal verification remains separate from command execution evidence.
- subagent/research evidence may inform decisions but does not approve high-risk execution.
- sync-back and ship remain main workflow authority decisions.

Regression coverage included contract and authority checks confirming that:

- Phase 8 contract objects expose required runtime boundaries.
- lifecycle risk decisions do not mix agent/subagent selection into policy output.
- work units, subagents, context offload, evidence, and model artifacts stay non-authoritative by default.
- failed or archived subagent dispatch state does not become hidden authority for doctor/ship.

## 9. Human-readable interaction judgment

Blocked default output now answers the three required questions without requiring internal model knowledge:

| Question | Default output field |
|---|---|
| What happened? | result sentence |
| Why did it block? | `Why:` |
| What should I do next? | `Next:` |

Default route/test/sync-back/ship/lifecycle/doctor output no longer requires users to understand internal profile names, team-mode names, lifecycle projection scope keys, runtime SQLite table names, or adapter names. JSON and verbose output remain available for automation and diagnostics.

## 10. Findings and follow-up gaps

### Findings

- The Phase 8.2 gate policy now gives consistent route/test/sync-back/ship semantics for the current risk taxonomy.
- Direct low-risk tasks stay lightweight and can reach direct sync-back readiness.
- Review-before-sync-back tasks can validate but require review before applying status.
- Pre-test blockers stop command execution before validation commands run.
- Task-scoped sync-back does not inherit unrelated branch/global blockers as task apply blockers.
- Ship remains conservative for unresolved branch/global risk.
- API schema path detection was a real gap found only by the installed-project matrix and has been fixed.

### Follow-up gaps

No Phase 8.2 blocking gap remains after the final installed-project matrix. Future Phase 8 graph work can consume these lifecycle gate decisions as stable runtime policy inputs.
