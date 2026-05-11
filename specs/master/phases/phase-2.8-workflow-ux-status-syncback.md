# Phase 2.8 Workflow UX / Status / Run Inspect / Sync-back Hardening

## 定位

Phase 2.8 用于补齐真实工作流的产品化可用性：用户在目标仓库中应能通过 CLI 直接看到当前 SDD 状态、最近 run、阻塞 gap、下一步建议，并能显式检查与应用 verified run 的 sync-back proposal。

本 phase 不改变 runtime 默认原则：`do` / `verify` 只生成 run state、events、artifacts 和 sync-back proposal；只有用户显式执行 `sdd sync-back apply` 才允许写回 `tasks.md`。

## 依赖

- depends_on: Phase 2.7
- blocks: Phase 2.9
- required_by: Phase 2.9

## 范围

- 新增 `sdd status`。
- 新增 `sdd run list` 与 `sdd run inspect <run_id>`。
- 新增 `sdd sync-back inspect [<run_id>]` 与 `sdd sync-back apply [<run_id>]`；Phase 6.5 后常规路径按 partition + taskId 解析 latest eligible run。
- 在 core 中提供结构化 API，供 CLI 与 generated Claude Code entries 复用。
- 更新 `/sdd` 和 `/sdd:instructions` 为 status-first 引导。
- 强化 verify 后的 sync-back inspect/apply 提示。

## 非目标

- 不实现真正 agent orchestration runtime。
- 不实现 background write agents。
- 不实现 per-task worktree。
- 不实现 dependency wave 并发执行。
- 不实现 plugin loader、dashboard、SQLite run database 或 code knowledge graph。
- 不自动 commit/push。
- 不默认自动写回 `tasks.md`。

## 交付物

- `packages/core/src/index.ts`：run/status/sync-back core API。
- `packages/cli/src/main.ts`：Phase 2.8 CLI commands。
- `packages/core/src/instructions.ts`：status-first instruction payload。
- `packages/core/src/ai-tools.ts` 与 generated `.claude/` entries：入口提示刷新。
- `specs/master/phase2.8-{spec,plan,tasks,validation}.md`。

## 验收标准

- `sdd status` 能输出文档状态、task 汇总、latest run 与 recommended next command。
- `sdd run list` 能按 `updatedAt` 倒序列出 runs。
- `sdd run inspect <run_id>` 能展示 run state/events/artifacts/validation/syncBack 摘要。
- `sdd sync-back inspect [<run_id>]` 能只读判断 proposal 是否可应用。
- `sdd sync-back apply [<run_id>]` 仅在 verified/PASS、无 blocking gaps、proposal 存在且 task 唯一定位时写回 `tasks.md`。
- sync-back apply 幂等，不重复追加 Implementation Notes。
- blocked / PASS_WITH_GAPS / 有 blocking gaps 的 run 拒绝 apply。
- generated entries 指向 `sdd status`，verify 后提示 sync-back inspect/apply 且不静默写回。

## 下游引用产物

- Phase 2.9 可复用本 phase 的 `sdd status` 与 sync-back inspect/apply 作为 Claude Code workflow command 的状态源。
