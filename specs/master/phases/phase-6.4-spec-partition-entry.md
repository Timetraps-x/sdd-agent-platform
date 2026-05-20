# Phase 6.4 Spec Partition Entry

## 1. 定位

Phase 6.4 插入在 Phase 6.3 Declarative Agent/Skill Capability Runtime 和 Phase 6.5 Parallel Branch Run Isolation 之间。

本阶段目标是把 SDD 工作流的 branch/spec namespace 语义收口到第一个工作流产物入口 `/sdd:spec`：`sdd init` 只负责项目级接入，`/sdd:spec` 负责解析当前 Git branch 或显式 `--branch` 并创建/使用 `specs/<partition>/`，`sdd status` 只读查看当前或指定 partition 状态。

核心原则：分区解析必须确定、可解释、可复用；不能让 `init`、`status`、中间命令各自猜 branch，也不能让 `status` 静默创建或切换 workflow context。

## 2. 依赖

- depends_on: Phase 6.3 Declarative Agent/Skill Capability Runtime
- blocks: Phase 6.5 Parallel Branch Run Isolation
- required_by: Phase 6.5 Parallel Branch Run Isolation

## 3. 范围

- 建立 Phase 6.4 的 spec / plan / tasks / validation 执行文档。
- 定义并实现统一 workflow partition resolver。
- 支持 `/sdd:spec` 在无 `--branch` 时读取当前 Git branch，并创建/使用对应 `specs/<partition>/`。
- 支持 `/sdd:spec --branch <name>` 创建/使用指定 branch 对应 partition。
- 将 `sdd status` 调整为只读 branch view：默认查看当前 Git branch 对应 partition，`--branch` 查看指定 partition。
- 支持 branch 名到 safe partition id 的稳定映射，避免 `feature/foo` 直接变成嵌套目录。
- 为 spec 多次调用引入 revision/hash 语义，下游 plan/tasks 能识别 stale。
- 弱化 `init --branch` 的推荐语义，保留必要兼容提示。
- 更新 instruction / generated entry wording，明确 `/sdd:spec` 是正常 workflow entry。

## 4. 非目标

- 不新增 `/sdd` slash command。
- 不新增 `sdd workflow start`。
- 不实现 Phase 6.5 的 partition+task run lookup 或 affected file 冲突检测。
- 不把 `sdd status` 变成创建/切换 workflow 的入口。
- 不要求在本阶段完成 full worktree isolation 或跨 Git 分支代码执行并行。
- 不实现 Phase 8.0 code graph。

## 5. 交付物

- `specs/master/phases/phase-6.4-spec-partition-entry.md`
- `specs/master/phase6.4-spec.md`
- `specs/master/phase6.4-plan.md`
- `specs/master/phase6.4-tasks.md`
- `specs/master/phase6.4-validation.md`
- 更新后的 `specs/master/phases/README.md`
- 更新后的 `specs/master/phases/PHASE_STATUS.md`
- 更新后的 `specs/master/phases/phase-8.0-code-knowledge-graph-baseline.md`
- `packages/core/src/index.ts` 中的 partition resolver、status branch view、spec revision/stale 检测相关改动
- `packages/core/src/path-safety.ts` 中的 branch-to-partition 安全映射改动
- `packages/core/src/ai-tools.ts` / generated instructions 中的 `/sdd:spec` 入口说明改动
- `packages/core/src/index.test.ts` 中的 Phase 6.4 regression tests

## 6. 验收标准

- `sdd init` 不再被推荐为 branch/spec namespace 创建入口。
- `/sdd:spec` 无 `--branch` 时使用当前 Git branch 创建/使用对应 `specs/<partition>/`。
- `/sdd:spec --branch <name>` 创建/使用指定 branch 对应 partition。
- `sdd status` 默认只读查看当前 Git branch 对应 partition，partition 不存在时报告 `not_started` 并提示 `/sdd:spec`。
- `sdd status --branch <name>` 只读查看指定 partition，不创建目录、不切换上下文、不污染当前 branch。
- branch 名经过稳定 safe partition 映射，包含 `/` 的 Git branch 不会直接变成嵌套 specs 目录。
- `/sdd:spec` 多次调用会更新 spec revision/hash，并让旧 plan/tasks 标记 stale，而不是静默让下游继续通过。
- 现有显式 `--branch master` 兼容路径保持可用。
- focused Phase 6.4 regression、typecheck、tests、build 通过。

## 7. 可被下游引用的产物

- Phase 6.5 依赖本阶段的 workflow partition resolver 和 spec revision/stale 状态来绑定 run。
- Phase 8.0 可消费 partition metadata、spec revision/hash、document stale 状态作为 graph input。
- 后续 UX 文档可复用 `/sdd:spec` 作为 workflow entry 的规则，不再扩展新的 slash command。
