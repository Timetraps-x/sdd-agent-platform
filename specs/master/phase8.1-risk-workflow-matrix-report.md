# Phase 8.1 Risk Workflow Matrix Report

## Status

NEEDS FOLLOW-UP — full installed-project risk matrix validation ran successfully and exposed behavior differences that were not visible in the smaller representative Phase 8.1 gate.

This report is intentionally analytical: it records what happened, whether the behavior matches the intended risk workflow, and which gaps should drive the next implementation slice.

## Validation environment

- Package: `sdd-agent-platform-0.4.0.tgz`
- Installed project root: `C:\Users\inshn\AppData\Local\Temp\sdd-risk-matrix-20260519093213\project`
- Branch/partition: `risk-matrix`
- Validation command: `node --version`
- Real SDD task count: 15
- Generated verify metadata:
  - `author_role: verification-designer`: true
  - `independent_from_roles` includes `task-planner`: true
  - `independent_from_roles` includes `implementer`: true

## Risk taxonomy covered

The validation matrix covered these current project risk families:

| Family | Real task id | Trigger |
|---|---|---|
| Direct low-risk | `DIRECT` | docs-only affected file, no risk tags |
| Validation/evidence-only | `VALIDATION_ONLY` | `risk: validation-only` |
| Source boundary | `SOURCE_BOUNDARY` | `packages/core/src/...` affected file |
| Runtime state boundary | `RUNTIME_STATE` | `.sdd/run-index.json` affected file |
| Security | `SECURITY` | `risk: security` + source affected file |
| Token/secret | `TOKEN_SECRET` | `risk: token` + source affected file |
| Token/context budget | `TOKEN_CONTEXT` | `risk: token-risk` |
| Context budget | `CONTEXT` | `risk: context-risk` |
| Performance | `PERFORMANCE` | `risk: performance` |
| External unknown | `EXTERNAL` | `risk: external-unknown` |
| API/schema contract | `API_SCHEMA` | `risk: api-schema` |
| Database/data-loss | `DATABASE` | `risk: database`, `risk: data-loss` |
| State/concurrency | `STATE_CONCURRENCY` | `risk: state-machine`, `risk: concurrency` |
| CI/build/release | `CI_BUILD` | `risk: ci-build` |
| Unknown/blocked | `BLOCKED_UNKNOWN` | `risk: unknown` |

The report also ran requirement-level lifecycle decisions:

- `sdd lifecycle decide --direct-safe --json`
- `sdd lifecycle decide --external-unknown --impact-confidence low --validation unclear --json`

## Command transcript

Representative installed-project command sequence:

```powershell
npm pack --pack-destination <temp>/pkg --json
npm init -y
npm install <temp>/pkg/sdd-agent-platform-0.4.0.tgz
node_modules/.bin/sdd.cmd init --json
node_modules/.bin/sdd.cmd tasks route <task> --branch risk-matrix --json
node_modules/.bin/sdd.cmd test task <task> --branch risk-matrix --command "node --version" --json
node_modules/.bin/sdd.cmd sync-back inspect <run> --branch risk-matrix --task <task> --json
node_modules/.bin/sdd.cmd lifecycle decide --direct-safe --json
node_modules/.bin/sdd.cmd lifecycle decide --external-unknown --impact-confidence low --validation unclear --json
node_modules/.bin/sdd.cmd ship --dry-run --branch risk-matrix --json
```

## Result matrix

| Task | Route result | Test result | Sync-back result | User-facing judgment |
|---|---:|---:|---:|---|
| `DIRECT` | allowed, `implementer`, team mode off | PASS, command ran | ready, direct, no approval | PASS: direct path works. |
| `VALIDATION_ONLY` | allowed, `implementer`, `review-lite` | PASS, command ran | ready, confirm required | PARTIAL: review only appears at sync-back. |
| `SOURCE_BOUNDARY` | allowed, `implementer`, `hyperplan` | PASS, command ran | ready, confirm required | PARTIAL/ISSUE: high source boundary can execute before approval/review gate. |
| `RUNTIME_STATE` | allowed, `implementer`, `hyperplan` | PASS, command ran | ready, confirm required | PARTIAL/ISSUE: runtime state can execute before approval/review gate. |
| `SECURITY` | BLOCKED, approval required | BLOCKED, command did not run | n/a | PASS: security blocks before execution. |
| `TOKEN_SECRET` | BLOCKED, approval required | BLOCKED, command did not run | n/a | PASS: token/secret blocks before execution. |
| `TOKEN_CONTEXT` | allowed, `implementer`, `review-lite` | PASS, command ran | ready, confirm required | PASS/PARTIAL: context-token separated from secret; review deferred to sync-back. |
| `CONTEXT` | allowed, `implementer`, `review-lite` | PASS, command ran | ready, confirm required | PASS/PARTIAL: compact/review behavior exists but not pre-test. |
| `PERFORMANCE` | allowed, `implementer`, `review-lite` | PASS, command ran | ready, confirm required | PASS/PARTIAL: compact/review behavior exists but not pre-test. |
| `EXTERNAL` | BLOCKED, approval required | BLOCKED, command did not run | n/a | PASS for safe blocking; see research-profile gap below. |
| `API_SCHEMA` | allowed, `implementer`, `hyperplan` | PASS, command ran | ready, confirm required | ISSUE: schema/contract risk is not pre-execution gated. |
| `DATABASE` | allowed, `implementer`, `hyperplan` | PASS, command ran | ready, confirm required | ISSUE: data-loss/database risk is not pre-execution gated. |
| `STATE_CONCURRENCY` | allowed, `implementer`, `hyperplan` | PASS, command ran | ready, confirm required | ISSUE: state/concurrency risk is not pre-execution gated. |
| `CI_BUILD` | allowed, `implementer`, `hyperplan` | PASS, command ran | ready, confirm required | ISSUE: CI/build/release risk is not pre-execution gated. |
| `BLOCKED_UNKNOWN` | BLOCKED, approval required | BLOCKED, command did not run | n/a | PASS for safe blocking, but blocker wording is approval-oriented rather than clarity-oriented. |

## Detailed observations

### 1. Direct path is healthy

`DIRECT` behaved as intended:

```json
{
  "route": { "exitCode": 0, "recommendedProfile": "implementer", "teamMode": "off" },
  "test": { "status": "PASS", "commandStatus": "PASS", "verifyContractAction": "created", "stepCount": 1, "syncBackReady": true },
  "syncBack": { "status": "ready", "mode": "direct", "requiresApproval": false }
}
```

This confirms low-risk docs/frontend-safe work can stay short and does not need a full SDD workflow.

### 2. Security and token/secret risks are healthy

`SECURITY` and `TOKEN_SECRET` both blocked before command execution:

```json
{
  "route": {
    "exitCode": 1,
    "blockedReason": "Lifecycle risk requires human approval before automated routing.",
    "nextAction": "Approve lifecycle risk before routing <task>, or rerun with --approved after review."
  },
  "test": {
    "status": "BLOCKED",
    "commandStatus": "BLOCKED",
    "stepCount": 0,
    "gaps": ["Lifecycle risk requires human approval before automated workflow continuation."]
  }
}
```

This matches the intended high-risk security workflow.

### 3. Medium/context/performance risks are not direct, but review is deferred

`VALIDATION_ONLY`, `TOKEN_CONTEXT`, `CONTEXT`, and `PERFORMANCE` all used `review-lite` route/team behavior and required sync-back confirmation:

```json
{
  "route": { "recommendedProfile": "implementer", "teamMode": "review-lite" },
  "test": { "status": "PASS", "commandStatus": "PASS", "stepCount": 1 },
  "syncBack": { "status": "ready", "mode": "confirm", "requiresApproval": true }
}
```

This is acceptable only if the intended compact workflow allows command execution before review and treats sync-back as the review checkpoint. If compact workflow is supposed to require review before test execution, this is a gap.

### 4. Several high-risk legacy categories are only sync-back gated

These risks route through `hyperplan`, but still recommend `implementer` and allow `/sdd:test` command execution before approval:

- `SOURCE_BOUNDARY`
- `RUNTIME_STATE`
- `API_SCHEMA`
- `DATABASE`
- `STATE_CONCURRENCY`
- `CI_BUILD`

Observed pattern:

```json
{
  "route": {
    "exitCode": 0,
    "recommendedProfile": "implementer",
    "blockedReason": null,
    "teamMode": "hyperplan"
  },
  "test": {
    "status": "PASS",
    "commandStatus": "PASS",
    "stepCount": 1,
    "syncBackReady": true
  },
  "syncBack": {
    "status": "ready",
    "mode": "confirm",
    "requiresApproval": true
  }
}
```

This is the main risk-workflow issue exposed by full real validation.

The platform recognizes these as risky enough for `hyperplan` and sync-back confirmation, but does not stop automated route/test execution. That means the lifecycle gate is inconsistent across high-risk classes: security/external/unknown block early, while schema/database/state/CI/source/runtime block only late.

### 5. External unknown has safe blocking, but task-route and requirement-route differ

Task-level `EXTERNAL` blocks route/test with human approval. Requirement-level lifecycle decision with explicit low confidence produces research:

```json
{
  "decision": {
    "profile": "research",
    "hard_gate_hits": [
      "external_unknown",
      "low_impact_confidence_scoutable",
      "unclear_acceptance_or_validation"
    ],
    "required_stages": [
      "research",
      "options",
      "decision",
      "architecture-artifact",
      "implementation-spec"
    ]
  },
  "autonomyCeiling": "research_before_implementation"
}
```

This shows the project currently has two semantics:

- Requirement-level unknown external impact can become `research_before_implementation`.
- Task-level `risk: external-unknown` becomes approval-blocked full/high-risk execution.

That may be acceptable, but it should be explicit. If `external-unknown` task risk is meant to route to research rather than approval-blocked full, the adapter needs adjustment.

### 6. Unknown/blocked wording is not precise enough

`BLOCKED_UNKNOWN` blocks safely, but the user-facing blocker is approval-oriented:

```json
{
  "blockedReason": "Lifecycle risk requires human approval before automated routing.",
  "nextAction": "Approve lifecycle risk before routing BLOCKED_UNKNOWN, or rerun with --approved after review."
}
```

For unclear/unknown work, the better action is likely to clarify intent/acceptance/validation rather than approve risk. This is not as severe as command execution leakage, but it is an interaction-quality gap.

## Ship behavior

Branch-level ship stayed blocked:

```json
{
  "exitCode": 0,
  "status": "BLOCKED",
  "blockedChecks": [
    "doctor_fast: doctor_status=FAIL",
    "latest_run: run=20260519-015 status=blocked validation=blocked sync_back=not_created",
    "lifecycle_risk_decision: enforced status=fresh profile=full approval=human-required"
  ]
}
```

This confirms global ship gate remains conservative. The gap is not ship; the gap is pre-execution lifecycle consistency for non-security high-risk task classes.

## Findings

### F-1 — High-risk pre-execution gate is inconsistent

Severity: high.

Security/token/external/unknown risk classes block before command execution. Source/runtime/schema/database/state/CI risk classes do not; they can run `/sdd:test` and produce PASS evidence before review, with approval deferred to sync-back.

Why it matters:

- The platform claims source/schema/database/state/CI are high-risk lifecycle classes.
- Real workflow lets those tasks execute validation commands and reach sync-back readiness without an earlier lifecycle approval/review gate.
- This weakens the mental model: users cannot infer whether “high risk” blocks before execution or only before apply/ship.

Suggested next fix:

- Define which risk dimensions require pre-test approval/review versus sync-back-only confirmation.
- Make `/sdd:test` honor that policy consistently.
- At minimum, source-boundary, runtime-state, API/schema, database/data-loss, state/concurrency, and CI/build should not look like normal implementer direct execution.

### F-2 — Route output hides lifecycle details for allowed-but-risky routes

Severity: medium.

For allowed risky routes, JSON does not expose the lifecycle profile/approval/stages in the route result fields used by this report. The user sees `recommendedProfile: implementer` plus team mode, but not a clear lifecycle summary.

Suggested next fix:

- Include lifecycle risk summary in all route decisions, not only blocked behavior.
- Make `nextAction` distinguish direct/compact/full/research paths.

### F-3 — Research semantics differ between requirement-level and task-level external risk

Severity: medium.

Requirement-level low-confidence external unknown routes to research. Task-level `external-unknown` blocks for human approval. This can be valid, but the distinction is not yet explicit in docs or user-facing route output.

Suggested next fix:

- Decide whether task-level `external-unknown` should become `research` or `full + human approval`.
- Document and encode that distinction.

### F-4 — Unknown/blocked nextAction is approval-oriented

Severity: low/medium.

Unknown task risk blocks, but the recommended next action says to approve lifecycle risk. For truly unclear work, it should usually ask to clarify intent, acceptance, validation, or impact first.

Suggested next fix:

- Split `human-required` from `blocked/unclear` nextAction messaging.

## Conclusion

Full risk-type real validation is now complete for the current taxonomy, and it found meaningful gaps.

The previous representative Phase 8.1 validation remains useful for verifies/sync-back/ship behavior, but it was not sufficient for risk workflow correctness. The full matrix shows the next necessary implementation slice should focus on risk-class-specific lifecycle enforcement and route/test user-facing clarity.
