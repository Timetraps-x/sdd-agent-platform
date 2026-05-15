# Phase 6.3 Declarative Agent/Skill Capability Runtime

## 1. 定位

Phase 6.3 插入在 Phase 6.2 RC Stabilization 和后续 core modularization / code graph 阶段之间。

本阶段目标是把 Phase 6 已有的 agent profile、skill capability、capability source、router、team-mode 合同从“仅内置硬编码 catalog”推进到“声明式 runtime registry”。项目可以通过 `.sdd/project.yml` 声明 SDD 内置素材库没有的 agent / skill / source，并在通过校验后被 runtime inspection、router、CLI 和 validation 识别。

核心原则：外部素材只能转译为声明式合同和证据边界，不导入任意 prompt，不授予隐式执行权，不绕过 SDD lifecycle / artifact / validation gates。

## 2. 依赖

- depends_on: Phase 6.2 RC Stabilization
- blocks: Phase 7.0 Core Runtime Modularization; Phase 8.0 Code Knowledge Graph Baseline
- required_by: Phase 7.0 Core Runtime Modularization; Phase 8.0 Code Knowledge Graph Baseline

## 3. 范围

- 建立 Phase 6.3 的 spec / plan / tasks / validation 执行文档。
- 扩展 `.sdd/project.yml` 解析，支持可选 `agent_runtime` 声明。
- 引入 merged runtime registry：built-in baseline + project-config declarations。
- 让 `agent-runtime`、`skill-capabilities`、`capability-sources`、`external-packs` inspection API 读取 merged registry。
- 让 `tasks route` 支持项目声明的 profile、skill capability、source、alias 和 routing rule。
- 增加 route decision 的可解释字段：registry sources、alias resolution、routing rule hits、quarantine warnings、adapter mapping。
- 扩展 validation，确保未知/缺失/越权声明 fail closed。
- 扩展 CLI 文本和 JSON 输出，展示 project-config runtime 声明和路由解释。
- 补充 Phase 6.3 targeted regression 和 built CLI smoke。

## 4. 非目标

- 不导入或拼接外部 prompt body。
- 不直接执行第三方 agent pack。
- 不实现 daemon、tmux UI、远程 worker fleet 或进程 supervisor。
- 不把 frontend/backend/database/release 写死成 router 特例。
- 不实现 Phase 8.0 code graph、embedding store、graph database 或 impact analysis。
- 不替换现有 CLI command framework。
- 不移除 Phase 6 内置 baseline profiles / capabilities / sources。

## 5. 交付物

- `specs/master/phases/phase-6.3-declarative-agent-skill-capability-runtime.md`
- `specs/master/phase6.3-spec.md`
- `specs/master/phase6.3-plan.md`
- `specs/master/phase6.3-tasks.md`
- `specs/master/phase6.3-validation.md`
- 更新后的 `specs/master/phases/PHASE_STATUS.md`
- 更新后的 `specs/master/phases/README.md`
- 更新后的 `specs/master/phases/phase-8.0-code-knowledge-graph-baseline.md`
- `packages/core/src/index.ts` 中的 merged registry、project runtime config、router、validation 改动
- `packages/cli/src/main.ts` 中的 Phase 6.3 inspection / route 输出改动
- `packages/core/src/index.test.ts` 中的 Phase 6.3 regression tests

## 6. 验收标准

- Phase 6.3 被插入到 6.2 和 7.0 之间，状态链路清晰。
- 没有 `agent_runtime` 配置时，现有 Phase 6 router、team-mode、CLI 输出和测试保持兼容。
- `.sdd/project.yml` 可以声明非内置 agent profile、skill capability、capability source、alias、routing rule。
- runtime inspection 和 validation 能看到 project-config 声明。
- router 能把任务调度到通过校验的 project-config profile。
- route decision 能显示 alias resolution、routing rule hits、registry source、quarantine warning。
- 缺失 profile/capability、重复 ID、外部素材越权、缺失 attribution/evidence 的声明 fail closed。
- 外部素材只作为 declarative metadata/quarantined source，不成为 prompt import 或 lifecycle authority。
- `npm run typecheck` 通过。
- focused Phase 6.3 regression 通过。
- `npm test` 通过。
- `npm run build` 通过。
- built CLI smoke 通过。

## 7. 可被下游引用的产物

- Phase 8.0 可消费 merged runtime registry metadata，把 project-config agent/skill/source 纳入 graph input。
- 后续 domain agent phases 可复用 `agent_runtime` 声明模型，不需要硬编码 frontend/backend/database/release 特例。
- 后续外部素材接入可复用 quarantine/source attribution/validated contract promotion 规则。
