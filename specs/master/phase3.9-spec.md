# Phase 3.9 Spec

## Problem

Phase 3.8 已经能为单 task 管理 worktree lifecycle，但后续 wave planner / executor 还缺少稳定的 task graph 输入。如果 Phase 3.10 直接从 Markdown 临时推导依赖，会把 depends_on 校验、cycle detection、file overlap、risk 和 validation summary 混进 wave planning。

## Goal

建立 Task Graph Planner：从 `sdd-task` metadata 生成只读 graph plan，输出 task nodes、dependency edges、file overlap edges、risk summary、validation summary 和 blocking diagnostics，作为 Phase 3.10 wave planner 的输入 contract。

## Requirements

- Core 提供 Phase 3.9 task graph planner contract/version、node、edge、diagnostic、plan 类型。
- Graph planner 必须读取 `specs/<branch>/tasks.md`，复用现有 parser/task model 和 retained phase fallback。
- Graph output 必须包含 task id/status/wave/depends_on/affected_files/risk/validation/source。
- Dependency edges 必须只连接可唯一解析的 task id。
- Missing dependency、duplicate id、ambiguous dependency 和 parse gap 必须作为 blocking diagnostic 输出。
- Cycle detection 必须产生 blocking diagnostic。
- File overlap 必须基于 normalized affected_files 输出 `file_overlap` edge。
- Summary 必须包含 task count、dependency count、file overlap count、high risk task ids 和 validation commands。
- CLI 提供 `sdd graph inspect [--branch <branch>] [--json]`。
- Doctor 必须报告 task graph planner contract visibility。

## Acceptance

- Valid tasks 能生成稳定 graph plan。
- Cycle/missing dependency 产生 blocking diagnostic 且 graph invalid。
- Graph 输出包含 task、edge、affected_files、risk 和 validation summary。
- CLI 能 inspect graph plan 并输出 JSON。
- Doctor 能检查 task graph planner contract visibility。
- Phase 3.9 不规划 wave、不执行 task、不创建 worktree、不启动 background delegation。
