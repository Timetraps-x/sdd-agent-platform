# Phase 1.9 Validation — Goal-level Verify 与 Doctor 加固

## Validation scope

本阶段修改 TypeScript runtime / CLI、tests、command docs 与 retained docs，因此执行 TypeScript typecheck、tests、build，并进行新增 `sdd verify task` 与 doctor hardening CLI smoke。

## Evidence

### 1. TypeScript typecheck

命令：

```text
npm run typecheck
```

结果：PASS。

输出摘要：

```text
> sdd-agent-platform@0.1.0 typecheck
> tsc --noEmit
```

### 2. Test suite

命令：

```text
npm test
```

结果：PASS。

输出摘要：

```text
1..28
# tests 28
# suites 0
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

新增覆盖点：

- `runGoalVerify` 能将 validator artifact 中的 acceptance evidence 映射为 PASS，并写入 coverage artifact / sync-back proposal / state / events。
- `runGoalVerify` 在 validator artifact 缺少 acceptance mapping 时返回 BLOCKED，并生成 `acceptance_coverage` gap。
- `doctor` 能报告 stale delegation、terminal event missing、artifact invalid，且不 auto-fix。

### 3. Build

命令：

```text
npm run build
```

结果：PASS。

输出摘要：

```text
> sdd-agent-platform@0.1.0 build
> tsc -b
```

### 4. CLI smoke — verify PASS

预置 artifacts：

```text
.sdd/runs/20260501-014/artifacts/review-P1.9-T1.md
.sdd/runs/20260501-014/artifacts/validation-P1.9-T1.md
```

命令：

```text
npm run sdd -- verify task P1.9-T1 --branch master --run 20260501-014 --review-artifact artifacts/review-P1.9-T1.md --validation-artifact artifacts/validation-P1.9-T1.md
```

结果：PASS。

输出摘要：

```json
{
  "runId": "20260501-014",
  "taskId": "P1.9-T1",
  "status": "PASS",
  "coverageArtifactPath": "artifacts/acceptance-coverage-P1.9-T1.md",
  "syncBackProposalPath": "artifacts/sync-back-proposal.md",
  "gaps": []
}
```

### 5. CLI smoke — verify BLOCKED on missing acceptance mapping

预置 artifacts：

```text
.sdd/runs/20260501-015/artifacts/review-P1.9-T1.md
.sdd/runs/20260501-015/artifacts/validation-P1.9-T1.md
```

命令：

```text
npm run sdd -- verify task P1.9-T1 --branch master --run 20260501-015 --review-artifact artifacts/review-P1.9-T1.md --validation-artifact artifacts/validation-P1.9-T1.md
```

结果：预期 exit 1，PASS。

输出摘要：

```json
{
  "runId": "20260501-015",
  "taskId": "P1.9-T1",
  "status": "BLOCKED",
  "coverageArtifactPath": "artifacts/acceptance-coverage-P1.9-T1.md",
  "gaps": [
    {
      "field": "acceptance_coverage",
      "message": "Acceptance item is not covered by validator evidence: CLI `sdd verify task <task_id> --run <run_id>` 可运行。"
    }
  ]
}
```

### 6. CLI smoke — doctor hardening reports gaps

预置 run：

```text
.sdd/runs/20260501-016/state.json
```

该 run 包含 stale RUNNING reviewer delegation 与 completed validator delegation missing artifact / terminal event gap。

命令：

```text
npm run sdd -- doctor
```

结果：预期 exit 1，PASS。

输出摘要：

```text
FAIL
[FAIL] stale_delegation: 20260501-016/D-P1.9-T2-reviewer-001 is RUNNING past timeout.
[FAIL] terminal_event_missing: 20260501-016/D-P1.9-T2-validator-001 is COMPLETED but has no terminal delegation event.
[FAIL] artifact_invalid: 20260501-016/D-P1.9-T2-validator-001: Cannot read artifact artifacts/validation-P1.9-T2.md
[FAIL] terminal_event_missing: 20260501-016/D-P1.9-T2-reviewer-001 has delegation_started without terminal event.
```

备注：doctor 同时报告了历史 smoke runs 中已有的 terminal/run_state gaps，这是 Phase 1.9 doctor hardening 的预期只读发现，不会 auto-fix。
## Acceptance evidence

- Goal-level verify 从已有 task model / run state / artifacts 读取证据，不调用外部 agent API。
- Acceptance coverage artifact 和 sync-back proposal 只写入 `.sdd/runs/<run_id>/artifacts/`。
- Doctor hardening 只读报告 stale delegation / terminal event / artifact gaps，不 auto-fix。
- Phase 1.10 real project trial 未执行。
