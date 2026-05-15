# Phase 6.10: Context Budget Runtime and Non-authoritative Log Workers

## 1. 定位

Phase 6.10 在 Phase 6.7 输出去重、Phase 6.9 可信证据层之后，补上运行时上下文预算能力：减少 token 消耗和主会话 context 占用，但不牺牲 SDD 工作流输出质量、证据可信度、doctor 判定、verify/sync-back 语义。

可采用的模型/算法路线已经具备工程可行性：hierarchical summarization、retrieval/working-set selection、content-addressed projection、hash-backed evidence summary、log compaction、failure-first extraction、deterministic authority separation。它们适合做运行时投影和摘要，不适合替代核心工作流判定。

## 2. 依赖

- depends_on: `phase-6.9-runtime-trust-fast-path-hardening.md`
- blocks / required_by: `phase-7.0-core-runtime-modularization.md`

Phase 7 收敛 core runtime 模块边界时，需要先有稳定的 context package / evidence summary / log summary 投影；Phase 8 消费运行历史前也依赖这些非权威摘要边界，否则图谱阶段会继续放大大输出和弱摘要带来的 context 压力。

## 3. 范围

- 定义 context profile：`brief`、`normal`、`forensic`。
- 为 status、tasks inspect/route、doctor、sync-back inspect、run inspect/evidence summary 提供默认简洁投影和 forensic 完整路径。
- 增加 hash-backed evidence summary：摘要必须包含 source path/hash、authoritative=false、usableForPass=false。
- 增加 `sdd context build`，按 task/mode/agent 输出最小工作集。
- 增加命令输出捕获摘要 contract：完整日志留在 run 目录，主上下文只读紧凑摘要。
- 增加 non-authoritative log worker contract：可写 run 日志、归档、摘要、索引，但不能驱动工作流状态。
- 增加预算/回归测试，确保默认输出不会重新膨胀。

## 4. 非目标

- 不用 subagent 处理 verify PASS/BLOCKED、artifact trust、doctor verdict、sync-back readiness、route decision、delegation execution policy。
- 不引入 daemon、远程 worker fleet、向量库或图数据库。
- 不隐藏 SDD 命令阶段，不把多阶段工作流伪装成单步。
- 不让摘要、cache、profile、context package 成为 PASS source evidence。
- 不改变 runtime/JSON/contract 的英文稳定边界。

## 5. 交付物

- `specs/master/phase6.10-spec.md`
- `specs/master/phase6.10-plan.md`
- `specs/master/phase6.10-tasks.md`
- `specs/master/phase6.10-validation.md`
- `packages/core/src/context/budget.ts`
- `packages/core/src/context/command-summary.ts`
- `packages/core/src/context/evidence-summary.ts`
- `packages/core/src/context/build-package.ts`
- `packages/core/src/context/log-worker.ts`
- `packages/core/src/context/context-build.test.ts`
- `packages/cli/src/commands/context.ts`

## 6. 验收标准

- 默认 brief 输出只展示 blockers、current task、next action、key evidence summary；forensic 模式仍可取完整内容。
- Evidence summary 和 context package 都带 source path/hash，并标记 non-authoritative / unusable for PASS。
- `sdd context build` 能按 task/mode/agent 输出最小工作集。
- Log worker contract 明确只能写日志/摘要/归档/索引，不能影响工作流判定。
- Tests 证明 derived summary/cache/context package 不能作为 PASS evidence。
- 真实安装 CLI 后能完成 Phase 6.10 工作流验证。

## 7. 可被下游引用的产物

- Context profile contract。
- Context package contract。
- Evidence summary projection contract。
- Command output summary contract。
- Non-authoritative log worker boundary。
- Budget regression thresholds。
