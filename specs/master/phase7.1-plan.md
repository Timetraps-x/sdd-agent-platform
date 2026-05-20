# Phase 7.1 Plan — Runtime Architecture and Storage v2 Research

## Gate 0 — Research framing

- 确认 Phase 7.0 后续优先级：runtime 架构优先于 agent capability/team/verification 扩展。
- 固化每个 Phase 7.x 的执行要求：先调研，再走当前 0.3.0 SDD 链路。
- 明确本阶段只输出架构和 Storage v2 spec，不实施迁移。

## Gate 1 — Local runtime source-of-truth scan

调研并记录以下模块的当前假设：

- `packages/core/src/runtime-paths.ts`
- `packages/core/src/run-state/run-state.ts`
- `packages/core/src/run-state/events.ts`
- `packages/core/src/run-state/invocation-ledger.ts`
- `packages/core/src/run-state/artifacts.ts`
- `packages/core/src/run-state/run-index.ts`
- `packages/core/src/storage/runtime-store.ts`
- `packages/core/src/status/project-status.ts`
- `packages/core/src/sync-back/inspect.ts`
- `packages/core/src/doctor/checks/run-evidence.ts`

输出：哪些地方把文件树作为事实来源，哪些地方已经可转为 SQLite/projection。

## Gate 2 — Real project runtime data synthesis

基于三个真实项目的 Phase 6 使用数据，整理：

- runId 与 branch 不匹配的问题。
- `.sdd/runs` 文件过多和职责混杂问题。
- verify/test/sync-back 对 runtime evidence 的真实需求。
- 测试环境协同验证中哪些内容适合 evidence 文件，哪些应进入 SQLite。

## Gate 3 — External mechanism research

聚焦可转译机制，不照搬实现：

- Claude Code context window / costs / statusline。
- Spec Kit / OpenSpec / cc-sdd / AgentPlane / Oh My OpenAgent。
- LangGraph / Temporal 的 checkpoint/resume 思想。

输出：对 Runtime Storage v2 的约束和反约束。

## Gate 4 — Runtime Storage v2 architecture decision

冻结三层边界：

```text
runtime.sqlite = structured runtime source of truth
specs/<branch> = official workflow documents
.sdd/runs/<branchSlug>/evidence = raw evidence attachments only
```

定义新 evidence 目录：

```text
.sdd/
  runtime.sqlite
  runs/
    <branchSlug>/
      evidence/
        evi_<date>_<time>_<scope>_<phase>_<kind>_<short>.<ext>
```

## Gate 5 — Phase 7.2 handoff

形成 Phase 7.2 implementation-ready handoff：

- schema candidates。
- path API candidates。
- evidence writer/reader boundary。
- high-frequency command fast-path目标。
- breaking-change and no-compatibility decision。
- tests/smoke checklist。

## Gate 6 — 0.3.0 SDD smoke

使用当前可用链路验证文档状态：

```powershell
npm run sdd -- status --branch master
npm run sdd -- tasks list --branch master
npm run sdd -- doctor --latest-only --branch master
```

如果本阶段未改代码，build/typecheck/test 可作为可选补充，不作为必需 gate。
