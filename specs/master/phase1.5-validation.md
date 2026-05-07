# Phase 1.5 Validation — SDD Parser / Task Model

## Validation scope

本阶段修改 TypeScript runtime / CLI 与 retained docs，因此按验证策略执行 TypeScript typecheck、tests、build，并进行 parser CLI smoke。

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
1..11
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

覆盖点：

- Runtime skeleton existing tests。
- Parser happy path：metadata + companion sections。
- Parser gap path：missing/invalid metadata + unknown dependency。
- Safe path segment：branch/runId 拒绝 `..`，仍允许 dotted/dashed/underscored normal names。
- Retained phase fallback：aggregate duplicate id detection。
- Retained phase fallback：cross-file dependencies over aggregate task set。
- Retained phase fallback：unknown dependencies still reported。
- Inspect ambiguity：duplicate id returns blocking ambiguity instead of first match。

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

### 4. Parser CLI smoke

命令：

```text
node dist/packages/cli/src/main.js tasks gaps --branch master
```

结果：PASS。

输出摘要：

```text
PASS
No task gaps detected.
```

命令：

```text
node dist/packages/cli/src/main.js tasks list --branch master
```

结果：PASS。

输出摘要：

```text
SDD tasks for master
P1.0-T1 completed wave=1 deps=none 封存 Baseline Draft
...
P1.5-T4 completed wave=3 deps=P1.5-T1,P1.5-T2,P1.5-T3 更新文档、索引和状态
gaps=0
```

命令：

```text
node dist/packages/cli/src/main.js tasks inspect P1.5-T1 --branch master
```

结果：PASS。

输出摘要：

```text
"id": "P1.5-T1"
"affectedFiles": ["packages/core/src/index.ts"]
"validation": ["npm run typecheck", "npm test"]
"gaps": []
```

### 5. Legacy retained task id normalization

Phase 1.0、Phase 1.1、Phase 1.2 retained task docs were updated from local `T1`/`T2` style IDs to phase-prefixed IDs (`P1.0-T1`, `P1.1-T1`, `P1.2-T1`, etc.). This keeps retained fallback deterministic and lets current `tasks gaps --branch master` pass without masking duplicate legacy IDs.

### 6. Boundary review

确认未实现以下下游内容：

- Phase 1.6 artifact/delegation runtime。
- Phase 1.7 Claude Code command integration / gate execution。
- Phase 1.8 single task loop。
- Phase 1.9 doctor hardening / goal-level validator runtime。
- Task execution、agent/workflow execution、validator command execution。
- Markdown sync-back writer 或自动改写 SDD 文档。
- dependency wave 并发调度、overlap gate、worktree isolation。

## Result

PASS。

Phase 1.5 blocker-fix validation passes. Phase 1.5 parser/task model remains limited to parser, task model, gap reporting, safe path checks, and inspection behavior; Phase 1.6+ 仍保持 planned，尚未实现。
