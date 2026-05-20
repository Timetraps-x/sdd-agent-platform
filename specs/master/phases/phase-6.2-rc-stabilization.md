# Phase 6.2 RC Stabilization

## 1. 定位

Phase 6.2 是插入在 Phase 6.1 Resident Agent Worker Runtime 和后续 core modularization / code graph 阶段之间的 release-candidate 稳定化阶段。

本阶段不扩展新的 agent 能力，也不启动代码知识图谱。它的目标是把 Phase 1.0~6.1 已经形成的 SDD workflow、AI 工具入口投影、doctor/verify/sync-back、background/wave executor、agent/team-mode、resident worker runtime 收口成更适合 1.0 RC 的工程形态。

核心判断：当前项目缺的不是新 phase 能力，而是 core/CLI/test 的可维护边界、CLI UX 一致性、repo/package hygiene 和可重复 RC 验证。

## 2. 依赖

- depends_on: Phase 6.1 Resident Agent Worker Runtime
- blocks: Phase 7.0 Core Runtime Modularization; Phase 8.0 Code Knowledge Graph Baseline
- required_by: Phase 7.0 Core Runtime Modularization; Phase 8.0 Code Knowledge Graph Baseline

## 3. 范围

- 建立 Phase 6.2 的 spec / plan / tasks / validation 执行文档。
- 稳定 `packages/core/src/index.ts` 的模块边界，优先抽出低风险、边界清晰、行为可测试的逻辑。
- 稳定 `packages/cli/src/main.ts` 的 command / option / renderer / help 边界。
- 整理 `packages/core/src/index.test.ts` 中 Phase 6/6.1 相关测试组织或补充 targeted regression。
- 统一 CLI text / JSON / usage / next-action 心智模型。
- 固化 RC validation checklist：typecheck、test、build、package dry-run、local dist smoke。
- 清理 package contents 和 smoke hygiene，避免临时目录、run state、local settings、日志、凭据进入发布包。

## 4. 非目标

- 不实现 Phase 8.0 code graph、embedding store、graph database 或 impact analysis。
- 不扩展 resident worker 到 daemon、tmux UI、远程 worker fleet 或进程 supervisor。
- 不改变 artifact ingestion、review、validation、verify、sync-back 的完成语义。
- 不新增大规模 command framework。
- 不破坏 `packages/core/src/index.ts` 的 public export 兼容面。
- 不做无法由现有测试和 smoke 覆盖的大重写。

## 5. 交付物

- `specs/master/phases/phase-6.2-rc-stabilization.md`
- `specs/master/phase6.2-spec.md`
- `specs/master/phase6.2-plan.md`
- `specs/master/phase6.2-tasks.md`
- `specs/master/phase6.2-validation.md`
- 更新后的 `specs/master/phases/PHASE_STATUS.md`
- 更新后的 `specs/master/phases/README.md`
- 必要的 core / CLI / test 稳定化改动
- RC validation evidence

## 6. 验收标准

- Phase 6.2 被插入到 6.1 和 7.0 之间，状态链路清晰。
- core/CLI/test 至少完成一轮低风险边界收口，公共行为不破坏。
- CLI 输出和 next-action guidance 不再扩大隐式 branch fallback 等不清晰心智模型。
- `npm run typecheck` 通过。
- `npm test` 通过。
- `npm run build` 通过。
- `npm pack --dry-run` 输出可接受。
- `node ./dist/packages/cli/src/main.js status` 可运行。

## 7. 可被下游引用的产物

- Phase 8.0 在启动 code graph 前，可引用 Phase 6.2 的 RC validation evidence 和 Phase 7.0 core module boundary evidence 作为 graph baseline 的稳定输入条件。
- 后续 release / publish 阶段可复用 Phase 6.2 validation checklist。
