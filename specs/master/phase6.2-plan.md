# Phase 6.2 Plan: RC Stabilization

## Strategy

Phase 6.2 按“先锁边界，再做小步稳定化，再跑完整 RC 验证”的顺序推进。所有改动都以保持现有行为为前提，不把稳定化阶段变成新功能开发。

## Track A: Phase chain and documentation

- 新增 Phase 6.2 source artifact、spec、plan、tasks、validation。
- 更新 `PHASE_STATUS.md`，让 6.1 的 next gate 指向 6.2，新增 6.2 in-progress 行，再让 6.2 指向 7.0。
- 更新 `phases/README.md`，在 Phase 6 列表中加入 6.2。
- 更新 Phase 8.0 的依赖描述，让它消费 Phase 6.2 RC evidence，并记录 Phase 7.0 core modularization 的前置门禁。

## Track B: Core boundary stabilization

目标文件：`packages/core/src/index.ts`

原则：

- 保留 `index.ts` 作为 public export/barrel。
- 优先提取纯逻辑或低耦合 helper。
- 不改变 run state、artifact ingestion、verify、sync-back、worker runtime 的语义。
- 以 `packages/core/src/ai-tools.ts` 和 `packages/core/src/instructions.ts` 的模块风格为参考。

优先候选：

1. task/document parsing 相关纯逻辑。
2. artifact result markdown parse / validation 相关逻辑。
3. lifecycle risk signal / decision helper。
4. doctor/run inspect issue aggregation helper。
5. Phase 6/6.1 静态 contract/helper。

暂缓候选：

- run state/event 写入主路径。
- sync-back markdown rewrite 主路径。
- background/wave/resident worker 状态机重写。

## Track C: CLI boundary and UX stabilization

目标文件：`packages/cli/src/main.ts`

原则：

- 不引入重型 command framework。
- 保持现有 command / flag / exit behavior。
- 优先整理 option parsing、renderers、help/usage text。
- 补充代表性 CLI text/json regression。

重点命令族：

- `status`
- `doctor`
- `tasks`
- `run inspect`
- `background`
- `worker-runtime`
- `team-mode`
- `agents` / `workers`
- `sync-back`

UX checklist：

- 默认 text，`--json` 输出结构化数据。
- 缺参 usage 明确。
- next-action 行可直接执行。
- branch resolution 只来自 explicit/configured source，不出现静默 fallback 叙事。

## Track D: Tests and RC validation

- 以现有 `packages/core/src/index.test.ts` 为安全网。
- 如果生产代码抽出稳定边界，再按领域拆测试；否则先补 focused tests。
- 运行 baseline validation 后再重构。
- 每轮稳定化后运行 focused regression，最后运行完整 RC checklist。

## Implementation order

1. 新增 Phase 6.2 文档和状态链路。
2. 运行 baseline focused/full validation。
3. 做低风险 core boundary 收口。
4. 做低风险 CLI boundary / UX 收口。
5. 补充或整理测试。
6. 跑 RC checklist。
7. 更新 Phase 6.2 validation/status 证据。

## Risk controls

- Public exports 由 `packages/core/src/index.ts` 继续承载。
- 每次提取保持行为等价，避免顺手改业务语义。
- 若某个模块出现循环依赖或测试不稳定，回退为小范围 helper 分组，不强行拆大模块。
- 不启动 Phase 8.0 graph 相关实现。
