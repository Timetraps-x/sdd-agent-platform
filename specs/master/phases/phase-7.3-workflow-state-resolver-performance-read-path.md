# Phase 7.3 Workflow State Resolver and Performance Read Path

## 1. 定位

Phase 7.3 在 Runtime Storage v2 之上统一 workflow 状态解析和高频命令读路径。目标是让 status、tasks、doctor、sync-back 通过一致的 resolver 决策，而不是各自扫描 docs/runs/evidence。

本阶段先调研 7.2 实现状态、现有命令读路径、真实项目 status/doctor/sync-back 使用数据，以及 Claude Code statusline/cost 和开源工具的 fast status / projection / cache 机制，再走 0.3.0 SDD 链路。

## 2. 依赖

- depends_on: Phase 7.2 Runtime Storage v2 Implementation
- blocks: Phase 7.4 Verification Contract Architecture
- required_by: Phase 7.4 Verification Contract Architecture

## 3. 范围

- 新增或收敛 Workflow State Resolver。
- 统一 branch、workflow docs、task state、latest command run、evidence refs、staleness、blocking gaps、recommended next action。
- 定义 status/tasks/doctor/sync-back 的默认 fast read path。
- 将 deep evidence scan 收敛到显式 deep 模式或特定诊断命令。
- 让 plan 阶段的工程性能分析结果可被 status/doctor 引用。

## 4. 非目标

- 不新增 `verify.md`。
- 不新增 `/sdd:test`。
- 不做完整 sync-back approval card。
- 不扩 command-scoped team runtime。

## 5. 交付物

- Workflow State Resolver contract。
- Status/tasks/doctor/sync-back fast path。
- Resolver-based blocking reason and next action。
- Performance read-path tests。

## 6. 验收标准

- `sdd status` 输出能明确当前 workflow 状态和 next action。
- `sdd tasks list` 不重建全部 run 文件状态。
- `sdd doctor --latest-only` 默认不读取大量 evidence 文件。
- `sdd sync-back inspect` 能解释阻塞原因。
- 高频命令读路径有测试覆盖。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-7.3-workflow-state-resolver-performance-read-path.md`
- Workflow State Resolver contract
