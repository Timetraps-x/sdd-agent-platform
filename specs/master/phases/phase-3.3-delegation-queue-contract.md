# Phase 3.3 Delegation Queue Contract

## 定位

Phase 3.3 定义后台 delegation queue 的静态 contract。它只说明什么请求可以进入队列、队列项如何标识、如何和现有 run state/events 对齐，不启动 worker，也不执行后台写操作。

## 依赖

- Phase 3.1 Tool / Capability Registry Baseline。
- Phase 3.2 Tool / Plugin Loading Contract。
- Phase 1 delegation / liveness / artifact contract。

## 范围

- 定义 delegation queue item schema。
- 定义 enqueue 条件、去重键、幂等语义和 source run/task 绑定。
- 定义 queue 与 `.sdd/runs/<run_id>/state.json`、`events.jsonl` 的事实源关系。
- 提供只读 inspect/list API 和 CLI 可见性。
- Doctor 能检查 queue contract 是否完整。

## 非目标

- 不实现 worker、后台执行或轮询器。
- 不创建 worktree。
- 不调度 dependency wave。
- 不执行 artifact ingestion。
- 不改变 Claude Code 权限模型。

## 交付物

- `phase3.3-spec.md`、`phase3.3-plan.md`、`phase3.3-tasks.md`、`phase3.3-validation.md`。
- Core queue contract 类型和只读 API。
- CLI queue inspect/list 能力。
- Doctor queue contract check。

## 验收标准

- Queue contract 能表达 queue item id、run id、task id、agent role、requested capability、dedupe key 和 status source。
- Queue inspect/list 不产生后台执行副作用。
- Doctor 能报告 queue contract PASS/FAIL。
- Tests 覆盖 schema/API/CLI/doctor。
- Typecheck/test 验证通过。
- Phase status 和 retained docs 完成。

## 下游引用

- Phase 3.4 使用本 phase 的 queue item 和事件边界定义 state machine。
- Phase 3.11 使用本 phase 的 queue contract 作为 background executor 输入。
