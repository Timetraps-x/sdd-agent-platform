# Phase 3.0 Plan

## Approach

1. 创建 Phase 3.0 platform extension baseline artifact，声明 Phase 3 子阶段顺序。
2. 创建 `phase3.0-spec.md`、`phase3.0-plan.md`、`phase3.0-tasks.md`、`phase3.0-validation.md`。
3. 更新 `specs/master/phases/README.md`，新增 Phase 3 table。
4. 更新 `specs/master/phases/PHASE_STATUS.md`，将 Phase 3.0 标记为 `in_progress`。
5. 更新顶层 `spec.md`、`plan.md`、`tasks.md`、`validation.md` Phase 3 索引。
6. 运行 focused verification：`sdd tasks gaps --branch master`、`sdd doctor --latest-only`。

## Phase 3 child phase order

1. Phase 3.1 Tool / Capability Registry Baseline：静态能力声明、agent/tool mapping、doctor visibility。
2. Phase 3.2 Tool / Plugin Loading Contract：资产版本、兼容性检查、只读加载边界。
3. Phase 3.3 Delegation Queue Contract：后台 delegation 队列声明、入队条件、去重键和状态事实源边界。
4. Phase 3.4 Delegation State Machine：delegation 状态、事件、终态、重试/取消/超时转移。
5. Phase 3.5 Worker Adapter Contract：worker adapter 输入输出、权限提示和执行边界，不启动后台写。
6. Phase 3.6 Artifact Result Ingestion：后台结果 artifact 的读取、校验、归档和 gap 映射。
7. Phase 3.7 Worktree Isolation Contract：隔离策略、文件 overlap 判定和进入 worktree 的 gate。
8. Phase 3.8 Worktree Lifecycle Manager：创建、保留、清理 worktree 的本地生命周期与审计事件。
9. Phase 3.9 Task Graph Planner：从 sdd-task 解析 task graph、depends_on、affected_files 和风险。
10. Phase 3.10 Wave Planner：把 task graph 规划为安全 wave，不执行 wave。
11. Phase 3.11 Background Executor：基于 queue/state/worker contract 执行单 task 后台任务。
12. Phase 3.12 Wave Executor：基于 wave plan 调度多 task，受 isolation 和 governance gate 约束。
13. Phase 3.13 Local Run Index：为 `.sdd/runs` 建立可重建本地索引，不替代文件事实源。
14. Phase 3.14 Governance Policy：长期运行、并发、清理、审计和用户确认策略。

## Safety

- 先 registry/capability，再 plugin contract，再 queue/state/worker/artifact ingestion，再 isolation，再 graph/wave planning，再 executor/index/governance。
- 不把 tool registry 设计成 prompt-only 巨型规则；能力必须可被 doctor 和 future scheduler 读取。
- 不绕过 Claude Code 原生权限模型。
- 不自动执行 destructive cleanup、merge、push 或 sync-back apply。
