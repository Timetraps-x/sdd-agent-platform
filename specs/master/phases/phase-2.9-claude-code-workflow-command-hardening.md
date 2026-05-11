# Phase 2.9 Claude Code Workflow Command Hardening

## 定位

Phase 2.9 用于把 Phase 2.8 已提供的 `sdd status`、run inspect 与 sync-back inspect 能力转译到 Claude Code generated entries，使 `/sdd`、`/sdd:do`、`/sdd:verify` 更像状态驱动的工作流入口，而不是静态命令说明。

本 phase 不改变 runtime 模型：CLI/core 仍是动态状态源；generated Claude Code entries 仍是薄入口；`sync-back apply` 仍必须由用户显式批准。

## 依赖

- depends_on: Phase 2.8
- blocks: Phase 3.0
- required_by: Phase 3.0

## 范围

- 强化 `/sdd`：先运行 `sdd status`，按 recommended next command 引导下一步。
- 强化 `/sdd:do`：先确认 status/task boundary，再进入 task do flow。
- 强化 `/sdd:verify`：先确认 status/run/task，再执行 verify 和 sync-back inspect。
- 收紧 `sdd instructions overview|do|verify` 的动态 instruction payload。
- 刷新 managed `.claude` entries。
- 增加 generated entry 与 instruction payload 测试。

## 非目标

- 不新增 runtime API。
- 不新增 CLI 命令。
- 不实现真正 agent orchestration runtime。
- 不实现 background write agents。
- 不实现 per-task worktree。
- 不实现 dependency wave 并发执行。
- 不实现 plugin loader、dashboard、SQLite run database 或 code knowledge graph。
- 不自动 commit/push。
- 不默认或静默运行 `sdd sync-back apply`。

## 交付物

- `packages/core/src/ai-tools.ts`：workflow-specific generated command templates。
- `packages/core/src/instructions.ts`：status/run/sync-back driven instruction payloads。
- `.claude/commands/sdd.md`、`.claude/commands/sdd/do.md`、`.claude/commands/sdd/verify.md`：由 `sdd update` 刷新。
- `packages/core/src/index.test.ts`：Phase 2.9 entry/instruction 测试。
- `specs/master/phase2.9-{spec,plan,tasks,validation}.md`。

## 验收标准

- `/sdd` 明确执行 `sdd status` 并按 recommended next command 引导。
- `/sdd:do` 明确执行 `sdd status`、`sdd instructions do --json`、`sdd tasks inspect <task_id>`，并只在 task boundary 内推进 `sdd do task <task_id>`。
- `/sdd:verify` 明确执行 `sdd status`、`sdd instructions verify --json`、`sdd verify task <task_id> [--run <run_id>]`，PASS 后只运行 `sdd sync-back inspect`；Phase 6.5 后常规路径省略 `--run`。
- generated entries 明确禁止静默 `sync-back apply`。
- instruction payload 与 generated entries 的流程一致。
- `npm run typecheck`、`npm test`、`npm run build` 通过。
- 平台仓库 smoke 与真实目标仓库只读 smoke 通过。

## 下游引用产物

- Phase 3 可复用本 phase 的 workflow entry pattern，将 Claude Code entries 作为更复杂 orchestration/runtime adapter 的前置入口约束。
