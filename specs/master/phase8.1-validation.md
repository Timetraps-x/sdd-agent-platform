# Phase 8.1 Validation — Real /sdd Scenario Gate

## Status

PASS — targeted regression tests and real installed-project `/sdd` scenarios validate the Phase 8.1 lifecycle, verifies, route, sync-back, ship, and role-separation behavior.

## Validation environment

- Package: `sdd-agent-platform-0.4.0.tgz`
- Installed project root: `C:\Users\inshn\AppData\Local\Temp\sdd-phase81-real-20260519091709\project`
- Validation command used for executable tasks: `node --version`
- Branch/partition: `master`
- Real tasks created in temp installed project:
  - `DIRECT`: docs/frontend-safe direct task.
  - `STALE`: docs/frontend-safe stale-verify task.
  - `BLOCKED`: docs/frontend-safe task used after corrupting `verify.md`.
  - `SECURITY`: source/security-sensitive task.

## Targeted regression transcript

```powershell
node --test --import tsx packages/core/src/verification/verify-contract.test.ts packages/core/src/verification/test-runtime.test.ts packages/core/src/sync-back/sync-back.test.ts packages/core/src/router/route-sdd-task.test.ts packages/core/src/lifecycle/ship.test.ts packages/core/src/status/project-status.test.ts packages/core/src/phase8-risk-kernel.test.ts packages/core/src/phase8-projection-compat.test.ts packages/core/src/phase8-contracts.test.ts packages/core/src/stage-runtime/runtime.test.ts packages/core/src/orchestration/runtime.test.ts
```

Summary:

- `1..57`
- `# tests 57`
- `# pass 57`
- `# fail 0`

Coverage from this regression set:

- Verify contract creation, stale refresh, metadata inspection, and blocked behavior.
- `/sdd:test` verify action reporting and command/evidence capture.
- Task-scoped sync-back gate with branch-level lifecycle diagnostic preserved.
- Router nextAction approval wording for lifecycle approval blockers.
- Ship/status lifecycle risk and stale projection blocking.
- Stage runtime and orchestration handoff semantics including `goal-verify`.

## Real installed-project transcript and assertions

### 1. Missing verify contract

Command:

```powershell
sdd test task DIRECT --branch master --command "node --version" --json
```

Observed JSON summary:

```json
{
  "existedBeforeTest": false,
  "testExitCode": 0,
  "status": "PASS",
  "commandStatus": "PASS",
  "verifyContractStatus": "PASS",
  "verifyContractAction": "created",
  "stepCount": 1,
  "syncBackReady": true,
  "next": "sdd sync-back inspect 20260519-001 --branch master --task DIRECT",
  "runId": "20260519-001"
}
```

Judgment: PASS.

- `verify.md` did not exist before `/sdd:test`.
- `/sdd:test` created `verify.md`, re-inspected it to `PASS`, then executed the validation command.
- Result points directly to sync-back inspection, not a separate low-level verify command.

### 2. Stale verify contract

Setup:

```powershell
Add-Content specs/master/tasks.md "<!-- mutate tasks.md after verify to make verify.md stale -->"
sdd test task STALE --branch master --command "node --version" --json
```

Observed JSON summary:

```json
{
  "exitCode": 0,
  "status": "PASS",
  "commandStatus": "PASS",
  "verifyContractStatus": "PASS",
  "verifyContractAction": "refreshed",
  "stepCount": 1,
  "syncBackReady": true,
  "runId": "20260519-002",
  "indexHasCommand": true,
  "indexHasStdout": true
}
```

Judgment: PASS.

- `/sdd:test` detected stale `verify.md`, refreshed it, re-parsed the current branch model, and re-inspected to `PASS`.
- The command executed after refresh; evidence index contains both `node --version` and stdout.
- This exposed and fixed a real bug: the runtime previously refreshed `verify.md` but still passed the old stale model into lifecycle gating, causing false `BLOCKED` before command execution.

### 3. Blocked verifies

Setup:

```powershell
# Corrupt verify.md frontmatter contract.
sdd test task BLOCKED --branch master --command "node --version" --json
```

Observed JSON summary:

```json
{
  "exitCode": 1,
  "status": "BLOCKED",
  "commandStatus": "BLOCKED",
  "verifyContractStatus": "BLOCKED",
  "verifyContractAction": "blocked",
  "stepCount": 0,
  "gaps": [
    "verify.md contract is BLOCKED; contract: verify.md does not declare contract sdd-verify-doc-v1."
  ]
}
```

Judgment: PASS.

- Broken `verify.md` blocks before command execution.
- `stepCount=0` proves `/sdd:test` did not run validation commands against an invalid verify contract.

### 4. Direct low-risk path

Command:

```powershell
sdd tasks route DIRECT --branch master --json
sdd test task DIRECT --branch master --command "node --version" --json
```

Observed JSON summary:

```json
{
  "route": {
    "exitCode": 0,
    "recommendedProfile": "implementer",
    "blockedReason": null
  },
  "test": {
    "status": "PASS",
    "commandStatus": "PASS",
    "syncBackReady": true,
    "stepCount": 1
  },
  "evidence": {
    "validationExists": true,
    "indexExists": true,
    "validationHasSddResult": true,
    "validationHasAc1": true,
    "indexHasAc1": true,
    "indexHasCommand": true,
    "indexHasStdout": true
  }
}
```

Judgment: PASS.

- Low-risk docs/frontend-safe work remains on the lightweight direct path.
- Runtime command evidence is not just an exit code; the validation artifact and test index map AC evidence and command output.

### 5. High-risk route

Command:

```powershell
sdd tasks route SECURITY --branch master --json
```

Observed JSON summary:

```json
{
  "exitCode": 1,
  "recommendedProfile": null,
  "blockedReason": "Lifecycle risk requires human approval before automated routing.",
  "nextAction": "Approve lifecycle risk before routing SECURITY, or rerun with --approved after review.",
  "lifecycleApprovalPolicy": null
}
```

Judgment: PASS.

- Security/source-boundary task does not route into direct execution.
- User-facing `nextAction` says approval is required and no longer mislabels the blocker as task-gap fixing.

### 6. Sync-back task scope and branch-level ship gate

Commands:

```powershell
sdd sync-back inspect 20260519-001 --branch master --task DIRECT --json
sdd sync-back inspect 20260519-002 --branch master --task STALE --json
sdd ship --dry-run --branch master --json
```

Observed sync-back JSON summaries:

```json
{
  "DIRECT": {
    "exitCode": 0,
    "status": "ready",
    "mode": "direct",
    "requiresApproval": false,
    "lifecycleScopeKey": "master:all:none:none",
    "lifecycleApprovalPolicy": "human-required",
    "reasons": []
  },
  "STALE": {
    "exitCode": 0,
    "status": "ready",
    "mode": "direct",
    "requiresApproval": false,
    "reasons": []
  }
}
```

Observed ship JSON summary before corrupting `verify.md`:

```json
{
  "exitCode": 0,
  "status": "BLOCKED",
  "blockedChecks": [
    "doctor_fast: doctor_status=FAIL",
    "latest_run: run=20260519-002 status=completed validation=pass sync_back=proposed",
    "lifecycle_risk_decision: enforced status=fresh profile=full approval=human-required"
  ]
}
```

Observed ship JSON summary after corrupting `verify.md` and running blocked verify scenario:

```json
{
  "exitCode": 0,
  "status": "BLOCKED",
  "blockedChecks": [
    "doctor_fast: doctor_status=FAIL",
    "latest_run: run=20260519-003 status=blocked validation=blocked sync_back=not_created",
    "lifecycle_risk_decision: enforced status=fresh profile=full approval=human-required"
  ]
}
```

Judgment: PASS.

- Direct-safe task sync-back is task-scoped and reaches `ready` even though branch/global lifecycle diagnostic reports `human-required` because the same branch contains `SECURITY`.
- Branch-level ship remains blocked by unresolved high-risk lifecycle state and latest-run readiness, which is the expected global gate behavior.

### 7. Agent/subagent authority

Generated `verify.md` after refresh includes:

```json
{
  "authorRole": true,
  "independentFromTaskPlanner": true,
  "independentFromImplementer": true,
  "mentionsAuthoritySeparation": true,
  "mentionsImplementerNotAuthority": true
}
```

Judgment: PASS.

- Generated `verify.md` declares `author_role: verification-designer`.
- Generated `verify.md` declares independence from `task-planner` and `implementer`.
- Generated verification rules state that task generation and verify ownership must not share authority, and that implementer must not own authoritative verification.
- Contract tests also assert work units, subagents, context offload, evidence, and model artifacts remain non-authoritative by default.

## Fix made during real validation

Real stale-verify validation exposed a runtime ordering bug in `packages/core/src/verification/test-runtime.ts`: after `/sdd:test` refreshed `verify.md`, it continued using the pre-refresh parsed `SddTaskModel`. That stale model made lifecycle gating see stale document state and block command execution.

Fix:

- Re-parse `parseSddBranch(projectRoot, branch)` after verify action `created` or `refreshed`.
- Re-resolve the target task from the refreshed model before binding run state and orchestration gates.
- Update stale verify unit test to assert the intended user-facing behavior: refresh then command execution then PASS.

## Final judgment

Phase 8.1 real `/sdd` scenario gate passes.

Command success alone was not used as the completion signal. Each scenario inspected user-facing JSON behavior, verify artifacts, evidence artifacts, sync-back readiness, route next actions, branch-level ship blocking, and authority metadata.