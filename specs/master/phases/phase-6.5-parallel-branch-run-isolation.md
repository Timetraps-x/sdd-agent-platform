# Phase 6.5 Parallel Branch Run Isolation

## 1. 定位

Phase 6.5 插入在 Phase 6.4 Spec Partition Entry 和 Phase 7.0 Code Knowledge Graph Baseline 之间。

本阶段目标是在 Phase 6.4 已经确定 workflow partition 的基础上，让多分支、多 task、多 run 并行时不会互相干扰：run 必须绑定 partition/gitBranch/taskId/document hashes，后续 verify/sync-back 必须通过 partition + taskId 或显式 runId 确定性找到正确 run，并在错误 Git 分支、stale run、affected file 冲突时 fail closed 或要求确认。

核心原则：用户和 AI 不应该记忆或猜测 `.sdd/runs/<runId>`；CLI 应通过结构化 run state 和可重建 run index 解析当前 task 的 latest eligible run。

## 2. 依赖

- depends_on: Phase 6.4 Spec Partition Entry
- blocks: Phase 7.0 Code Knowledge Graph Baseline
- required_by: Phase 7.0 Code Knowledge Graph Baseline

## 3. 范围

- 建立 Phase 6.5 的 spec / plan / tasks / validation 执行文档。
- 扩展 run state，记录 partition、gitBranch、taskId、affectedFiles、basedOnSpecHash、basedOnPlanHash、basedOnTasksHash。
- 扩展本地 run index，支持 partition+task 的 latest eligible run 查询。
- 新增内部 run resolver：显式 `--run` 优先，否则通过 partition + taskId 查 run index。
- 让 verify/sync-back 默认可以在不要求用户手填 runId 的情况下找到当前 partition/task 的 latest eligible run。
- `sdd status` 展示当前或指定 partition 下每个 task 的 latest run、stale 状态、next command。
- 在 verify/sync-back apply 前识别 run stale、当前 Git branch 与 run.gitBranch 不一致、active run affectedFiles 重叠等风险。
- 保持 `.sdd/runs/<runId>/state.json` 为权威状态，run index 仍为可重建派生视图。

## 4. 非目标

- 不新增 `/sdd` slash command。
- 不实现真正的后台多 worktree 调度器或远程 worker fleet。
- 不让 run index 成为不可重建的权威数据库。
- 不自动 rebase active run 到新的 spec/plan/tasks revision。
- 不允许 stale run 静默 verify/pass/sync-back apply。
- 不实现 Phase 7.0 code graph。

## 5. 交付物

- `specs/master/phases/phase-6.5-parallel-branch-run-isolation.md`
- `specs/master/phase6.5-spec.md`
- `specs/master/phase6.5-plan.md`
- `specs/master/phase6.5-tasks.md`
- `specs/master/phase6.5-validation.md`
- 更新后的 `specs/master/phases/README.md`
- 更新后的 `specs/master/phases/PHASE_STATUS.md`
- 更新后的 `specs/master/phases/phase-7.0-code-knowledge-graph-baseline.md`
- `packages/core/src/index.ts` 中的 run state binding、run index、run resolver、stale/wrong-branch/conflict gate 改动
- `packages/cli/src/main.ts` 中 verify/sync-back 默认 run resolution 和 status 展示改动
- `packages/core/src/index.test.ts` 中的 Phase 6.5 regression tests

## 6. 验收标准

- `do task` 创建的 run 写入 partition、gitBranch、taskId、affectedFiles 和 document hash snapshot。
- 同名 task 在不同 partition 下不会互相覆盖 latest run。
- `verify task <task>` 无 `--run` 时能通过当前 partition + taskId 找到 latest eligible run。
- `sync-back inspect/apply` 使用 run.state.partition/gitBranch，不因当前 Git branch 或 current workflow 指针改变而串分区。
- `sdd status` 默认显示当前 Git branch partition 的 task latest run；`sdd status --branch <name>` 显示指定 partition 的 latest run，且标记 working tree 是否匹配。
- spec/plan/tasks 变更后，旧 run 被识别为 stale，verify/sync-back apply 不会静默继续。
- 当前 Git branch 与 run.gitBranch 不一致时，高风险命令默认阻断或要求显式确认。
- 多个 active run 触碰同一 affected file 时，status/doctor/governance 能显示冲突。
- run index 可由 `.sdd/runs/*/state.json` 重建，缺失或 stale 时不会导致错误路由。
- focused Phase 6.5 regression、typecheck、tests、build 通过。

## 7. 可被下游引用的产物

- Phase 7.0 可消费 partition-aware run index、run snapshot hashes、stale/conflict/wrong-branch evidence 作为 graph input。
- 后续 worktree/worker 并行执行可复用 partition+task run resolver 和 affected file conflict gate。
- 后续 SDD UX 文档可声明“用户无需记 runId；CLI 通过 partition+task 找 latest eligible run”。
