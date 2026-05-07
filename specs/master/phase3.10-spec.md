# Phase 3.10 Spec

## Problem

Phase 3.9 已能输出只读 task graph，但 Phase 3.11+ 的 background executor / wave executor 还缺少稳定的 wave plan 输入。如果执行层直接从 graph 临时推导并发批次，会把拓扑排序、文件冲突、manual gate 和 blocked reason 混入执行逻辑。

## Goal

建立 Wave Planner：从 task graph 和 worktree isolation decision 生成只读 dependency wave plan，区分可规划 wave、manual gates 和 blocked tasks，为后续 executor 提供稳定 contract。

## Requirements

- Core 提供 Phase 3.10 wave planner contract/version、wave task、wave、gate、plan 类型。
- Wave planner 必须复用 `inspectTaskGraph(projectRoot, { branch })` 的 Phase 3.9 graph plan。
- Wave planner 必须复用 `inspectWorktreeIsolation(projectRoot, { branch, taskId, capabilityId })` 的 Phase 3.7 isolation decision。
- Wave plan 必须按 `depends_on` 拓扑顺序生成 wave。
- 同一 wave 内不得包含 `affected_files` overlap 的 task。
- Graph blocking diagnostics 或 isolation blocked task 必须进入 blocked tasks。
- Isolation manual task 必须进入 manual gates。
- 依赖 blocked/manual/non-plannable task 的 downstream task 必须进入 blocked tasks。
- CLI 提供 `sdd wave inspect [--branch <branch>] [--capability <capability_id>] [--json]`。
- Doctor 必须报告 wave planner contract visibility。

## Acceptance

- Valid graph 能生成稳定 wave plan。
- Dependency order 被拓扑 wave 尊重。
- File overlap task 不会进入同一 parallel wave。
- Manual/blocked task 输出明确 reasons。
- CLI 能 inspect human-readable 和 JSON wave plan。
- Doctor 能检查 wave planner contract visibility。
- Phase 3.10 不执行 task、不创建 worktree、不启动 background worker、不修改 task status 或 run state。
