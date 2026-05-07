# Phase 1.2 Runtime 骨架 Validation

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-1.2-runtime-skeleton.md` 的验证记录。

Phase 1.2 验证通过后，更新 `specs/master/phases/PHASE_STATUS.md`，并保留本文件作为 phase 命名验证文档。

## 1. 验证范围

验证对象：

- `packages/core/package.json`
- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`
- `packages/cli/package.json`
- `packages/cli/src/main.ts`
- `schemas/phase-1.2-project-contract.md`
- `schemas/phase-1.2-run-state-contract.md`
- `schemas/phase-1.2-event-log-contract.md`
- `schemas/phase-1.2-artifact-path-contract.md`
- `schemas/phase-1.2-lifecycle-decision-contract.md`
- `.sdd/project.yml`
- `.sdd/runs/20260501-001/state.json`
- `.sdd/runs/20260501-001/events.jsonl`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `specs/master/phase1.2-spec.md`
- `specs/master/phase1.2-plan.md`
- `specs/master/phase1.2-tasks.md`
- `specs/master/phase1.2-validation.md`
- `specs/master/spec.md`
- `specs/master/plan.md`
- `specs/master/tasks.md`
- `specs/master/validation.md`
- `README.md`
- `specs/master/phases/PHASE_STATUS.md`

## 2. 命令验证记录

### 2.1 Dependency install

Command:

```bash
npm install
```

Output summary:

```text
added/changed packages, audited 13 packages
found 0 vulnerabilities
```

### 2.2 TypeScript typecheck

Command:

```bash
npm run typecheck
```

Output:

```text
> sdd-agent-platform@0.1.0 typecheck
> tsc --noEmit
```

Result: pass

### 2.3 Runtime tests

Command:

```bash
npm test
```

Output summary:

```text
# tests 4
# pass 4
# fail 0
# duration_ms 332.9667
```

Covered checks:

- `initProject` creates readable project config.
- `createRun` writes state and append-only events.
- artifact path cannot escape artifacts directory.
- doctor reports missing git repo as fail in temp directory.

### 2.4 CLI smoke: init / doctor / run create

Command:

```bash
npm run sdd -- init && npm run sdd -- doctor && npm run sdd -- run create
```

Output summary:

```text
init: created .sdd/project.yml

doctor:
PASS
[PASS] git_repo
[PASS] project_config
[PASS] runs_dir
[PASS] specs_dir

run create:
{
  "runId": "20260501-001",
  "statePath": ".sdd/runs/20260501-001/state.json",
  "eventLogPath": ".sdd/runs/20260501-001/events.jsonl"
}
```

Result: pass

### 2.5 CLI smoke: run status

Command:

```bash
npm run sdd -- run status 20260501-001
```

Output:

```json
{
  "runId": "20260501-001",
  "status": "created",
  "phase": null,
  "currentTask": null,
  "updatedAt": "2026-04-30T16:50:06.249Z"
}
```

Result: pass

### 2.6 Build check

Command:

```bash
npm run build
```

Output:

```text
> sdd-agent-platform@0.1.0 build
> tsc -b
```

Result: pass

## 3. 验证清单

| Check | Expected | Result | Evidence |
|---|---|---|---|
| Project init | `.sdd/project.yml` 可生成且可读取 | pass | `.sdd/project.yml` contains `contract: phase-1.2-project-contract` and required sections. |
| Run creation | 创建唯一 run 目录并写入 state/events/artifacts | pass | `.sdd/runs/20260501-001/state.json`; `.sdd/runs/20260501-001/events.jsonl`; `.sdd/runs/20260501-001/artifacts/`. |
| State contract | `state.json` 包含 contract、runtime version、status、paths、lifecycle decision placeholder | pass | `.sdd/runs/20260501-001/state.json` lines 1-54. |
| Event contract | `events.jsonl` append-only 写入 run 和 lifecycle decision events | pass | `.sdd/runs/20260501-001/events.jsonl` includes `run_started` and `lifecycle_decision_recorded`. |
| Doctor | 当前仓库输出 PASS / WARN / FAIL 格式与可操作原因 | pass | `npm run sdd -- doctor` output overall `PASS` and four PASS checks. |
| CLI status | `sdd run status <run_id>` 可读取 run 快照 | pass | command output for `20260501-001`. |
| Artifact path guard | artifact resolver 阻止 `../` 逃逸 | pass | `npm test` subtest `artifact path cannot escape artifacts directory`. |
| TypeScript config | TypeScript typecheck 通过 | pass | `npm run typecheck` pass. |
| Tests | Runtime tests 通过 | pass | `npm test`: 4 pass, 0 fail. |
| Build | Build-compatible TypeScript config 通过 | pass | `npm run build` pass. |
| Phase boundary | 未实现 Phase 1.3+ 非目标能力 | pass | 仅新增 Phase 1.2 core/cli skeleton 与 Phase 1.2 contract docs；未新增 parser、agent delegation、artifact validator、command gate、workflow loop。 |
| Indexes | README 与 SDD 索引包含 Phase 1.2 | pass | `README.md`; `specs/master/spec.md`; `plan.md`; `tasks.md`; `validation.md`. |
| Phase status can be completed | validation evidence 已写入，允许更新 PHASE_STATUS | pass | 本文件 §2-§4 作为 completion evidence。 |

## 4. 验收结论

```yaml
phase: phase-1.2-runtime-skeleton
status: completed
validation_method:
  - npm run typecheck
  - npm test
  - cli-smoke
  - npm run build
completion_evidence:
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - schemas/phase-1.2-project-contract.md
  - schemas/phase-1.2-run-state-contract.md
  - schemas/phase-1.2-event-log-contract.md
  - schemas/phase-1.2-artifact-path-contract.md
  - schemas/phase-1.2-lifecycle-decision-contract.md
  - .sdd/project.yml
  - .sdd/runs/20260501-001/state.json
  - .sdd/runs/20260501-001/events.jsonl
  - specs/master/phase1.2-validation.md
next_gate: phase-1.3-contract-templates-adapters may start
open_gaps:
  - Phase 1.3 must materialize broader static schemas/templates/adapters without changing Phase 1.2 runtime facts.
  - Phase 1.5 must implement SDD parser/task model before task-aware runtime behavior.
  - Phase 1.6/1.9 must add artifact/delegation/liveness/doctor validation beyond this skeleton.
  - Phase 1.7 must populate lifecycle decision records using the canonical model and command gate.
```
