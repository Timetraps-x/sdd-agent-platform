# Phase 7.8 Sync-back Approval, Ship and Observability

## 1. 定位

Phase 7.8 在 runtime/state/verify/test/agent/team 基础上补齐人审、发布和观测闭环。它是 Phase 7 后续修复线的收口阶段，不应提前承担底层 runtime 或 verification contract 职责。

本阶段先调研真实项目 sync-back/release evidence、现有 sync-back/doctor/status/ship 命令、Claude Code statusline/cost，以及 GitHub Agentic Workflows、AgentPlane 等 GitHub/open-source review/apply gate、release readiness 和 observability surface 机制，再走 0.3.0 SDD 链路。

## 2. 依赖

- depends_on: Phase 7.5 Test Runtime and Evidence Execution; Phase 7.7 Command-scoped Team Runtime
- blocks: Phase 8.0 Code Knowledge Graph Baseline
- required_by: Phase 8.0 Code Knowledge Graph Baseline

## 3. 范围

- Sync-back approval card。
- `/sdd:ship` 与 `specs/<branch>/release.md`。
- statusline/progress surface integration direction。
- doctor fast/deep split for runtime/test/team/token/evidence health。
- recover/reconcile suggestion surface。
- context pressure、command duration、agent count、token usage、evidence count、runtime health visibility。

## 4. 非目标

- 不把 release summary 放入 `.sdd/runs`。
- 不把 approval card 写成大报告。
- 不让 statusline 承担持久审计。
- 不让 doctor 默认 deep scan。

## 5. 交付物

- Sync-back approval card renderer and JSON contract。
- `/sdd:ship` command and `release.md` template。
- Observability projection and status/doctor display。
- Deep doctor and recover/reconcile guidance。

## 6. 验收标准

- `sdd sync-back inspect` 能输出精简可审 approval card。
- `/sdd:ship` 能生成 `specs/<branch>/release.md`。
- status/doctor 能展示 runtime/test/team/token/evidence health。
- deep doctor 可诊断 evidence/test/sync-back/team/token 问题。
- Phase 8.0 可消费稳定 runtime/observability/graph-ready metadata。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-7.8-syncback-ship-observability.md`
- Sync-back approval, ship and observability contracts

## 8. 完成状态

Phase 7.8 已完成。验证证据见 `../phase7.8-validation.md`。

完成内容：

- `sdd sync-back inspect` 输出精简 approval card，并在 JSON 中暴露稳定 `sdd-sync-back-approval-card-v1` contract。
- `sdd ship [--branch <branch>] [--dry-run] [--json|--compact-json]` 输出 PASS/BLOCKED readiness，并在非 dry-run 时写入 `specs/<branch>/release.md`。
- `sdd statusline`、`sdd progress`、`sdd status --statusline` 输出 runtime/test/team/token/evidence health compact projection。
- `sdd doctor fast`、`sdd doctor deep`、`sdd doctor recover` 明确诊断范围；默认/current release readiness 保持 latest-only，不默认 deep scan。
- help、instructions、generated Claude Code entries 已更新，并继续明确 ship 不执行 publish、push、tag、deploy 或外部 release 状态变更。
- 当前验证门禁通过：`npm run build`、`npm run typecheck`、`npm test` 187/187、`npm pack --dry-run --json`、ship/statusline/doctor current-scope smokes、latest doctor 45/45 PASS。
- `doctor deep` 作为显式历史审计会暴露既有 Phase 6.x 历史 evidence debt；该结果保留为诊断面，不作为当前 latest-run release blocker。