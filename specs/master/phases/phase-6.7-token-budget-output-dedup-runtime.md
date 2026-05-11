# Phase 6.7 Token Budget and Output Dedup Runtime

## 1. 定位

Phase 6.7 在 Phase 6.6 文档信息架构之后、Phase 6.8 文档语言运行时之前，收敛 SDD runtime/CLI 的 token 消耗热点。重点不是泛泛重构，而是把直接导致高 token 输出、重复 JSON 分支、重复 evidence/policy prose 的运行时输出逻辑统一为可控的 output profile 和共享 renderer helper。

## 2. 依赖

- depends_on: Phase 6.6 Documentation Information Architecture
- blocks: Phase 6.8 Project Document Language Runtime
- required_by: Phase 6.8, Phase 7.0

## 3. 范围

- 统一 CLI JSON 输出路径，补齐 `--compact-json` 在 instructions、run index、sync-back、artifact validate 等输出面的行为。
- 抽取小型输出 helper，减少 `json ? jsonOutput(...) : renderText(...)` 分支重复。
- 收敛 `decision / evidence / gaps / next` 等重复 text section。
- 缩减重复 policy prose、artifact/evidence boilerplate 和 acceptance 全文复制倾向。
- 保持 JSON schema、contract key、status enum、artifact path、task id 稳定。

## 4. 非目标

- 不做全项目代码清理。
- 不重写 CLI dispatcher 架构。
- 不改变核心 SDD 状态机、run state、sync-back policy 或 task parser。
- 不引入多语言 runtime 输出。
- 不改变 `.sdd/runs`、run index、artifact 的机器可读结构。

## 5. 交付物

- `packages/cli/src/main.ts` 输出分支去重与 compact JSON 统一。
- `packages/core/src/instructions.ts` 重复 instruction/policy prose 收敛。
- `packages/core/src/index.ts` 仅对 token-heavy renderer 做输出重复收敛。
- `packages/core/src/index.test.ts` 中的输出兼容与 compact JSON 回归测试。
- Phase 6.7 spec/plan/tasks/validation 与运行证据。

## 6. 验收标准

- `status`、`doctor`、`tasks inspect/route`、`verify`、`instructions`、`run index`、`sync-back`、`artifact validate` 的 JSON 输出都通过统一输出 helper 或等价路径。
- `--compact-json` 在目标输出面可用，且输出仍是合法 JSON。
- text 输出保留必要的 decision/evidence/gaps/next 信息，但减少重复 boilerplate。
- 现有 JSON 字段不被重命名或本地化。
- 全量测试、构建、CLI smoke 和 installed CLI workflow 通过。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-6.7-token-budget-output-dedup-runtime.md`
- `specs/master/phase6.7-spec.md`
- `specs/master/phase6.7-plan.md`
- `specs/master/phase6.7-tasks.md`
- `specs/master/phase6.7-validation.md`
