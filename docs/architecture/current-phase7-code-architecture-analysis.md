# 当前 Phase 7 代码架构分析

本文只分析当前代码已经实现的架构形态，范围是 Phase 7.9 完成后的现有模型、算法、数据结构、运行链路与边界。不把后续期望态作为主内容，也不把未实现的 subagent / handoff / 风险决策重构当作既有事实。

## 1. 当前总体架构分层

当前代码的核心架构可以概括为：

```text
CLI command layer
  -> core domain services
    -> SDD documents parser / resolver
    -> run-state JSON artifacts
    -> runtime SQLite store
    -> projections / status / doctor / ship
```

现有实现不是单纯 prompt workflow，而是以 SDD 文档、运行状态、runtime store、artifact 和 projection 共同组成执行事实来源：

- SDD 文档定义期望状态：`spec.md`、`plan.md`、`tasks.md`、`verify.md` 等。
- run-state JSON 记录单次 run 的阶段、任务绑定、验证、sync-back、事件和 artifacts。
- SQLite runtime store 保存可查询的运行事实、证据、测试步骤、projection 和 legacy import。
- projection 保存派生视图，例如 workflow state、context build、team runtime decision、test runtime。
- status / doctor / ship 在这些事实基础上做只读聚合和门禁判断。

当前架构的主要特点是“文档驱动 + runtime 事实补充 + projection 聚合”，还不是显式的多 active-agent handoff runtime，也不是 Claude 官方形态的 subagent dispatch runtime。

## 2. SDD 文档与工作流状态模型

### 2.1 数据结构

工作流状态聚合入口是 `WorkflowStateResolution`，定义在 `packages/core/src/workflow-state/resolve.ts:42`。它包含：

- `context`：当前 SDD 分区 / branch 解析结果。
- `documents`：spec / plan / tasks 等文档存在性。
- `model`：解析后的 `SddTaskModel`。
- `taskCounts`：任务数量按状态聚合。
- `visibleGaps`：当前可见 gap。
- `latestRun` / `latestRunState`：当前任务或分区最新 run。
- `latestRunsByTask`：每个 task 最新 run 摘要。
- `affectedFileConflicts`：受影响文件的活跃 run 冲突。
- `blockingReasons`：阻塞原因。
- `recommendedNextCommand`：当前实现推导出的下一步命令。

### 2.2 算法

`resolveWorkflowState()` 的当前算法在 `packages/core/src/workflow-state/resolve.ts:60`：

1. 通过 `resolveSddContext()` 确定 branch / partition。
2. 并行解析 SDD 文档和读取所有 run states。
3. 如果文档存在，则认为 workflow active。
4. 从 run states 中筛选当前 partition 的每个 task 最新 run。
5. 对选中 task 检查受影响文件是否与其他活跃 run 冲突。
6. 将 blocking gaps 与文件冲突合并成 `blockingReasons`。
7. 推导 `recommendedNextCommand`。
8. 将轻量 projection 写入 runtime store，类型为 `workflow_state`。

下一步命令推导在 `packages/core/src/workflow-state/resolve.ts:175`，逻辑是：

- 无 active workflow：推荐 `/sdd:spec`。
- 有 blocking gap：推荐 `sdd tasks gaps`。
- 最新 run 有 sync-back proposal：推荐 `sdd sync-back inspect`。
- 否则推荐 inspect 第一个 pending task，或列出 tasks。

### 2.3 当前边界

这一层是状态解析和派生视图，不持有真实阶段控制权。当前没有显式的“阶段 active agent handoff packet”，也没有记录“哪个 specialist agent 拥有当前阶段控制权”的一等数据结构。

## 3. 生命周期决策模型

### 3.1 数据结构

生命周期决策核心结构是 `LifecycleDecisionRecord`，定义在 `packages/core/src/lifecycle/decision-gate.ts:15`。

当前 profile 固定为：

```text
direct | compact | full | research
```

配套字段包括：

- `input_summary`：输入信号摘要。
- `decision.profile`：选择的生命周期路径。
- `decision.confidence`：高 / 中 / 低置信度。
- `decision.hard_gate_hits`：命中的硬门禁。
- `required_stages` / `skipped_stages`：需要或跳过的阶段。
- `human_checkpoint_required`：是否需要人工 checkpoint。
- `reasons` / `escalation_triggers`：决策解释和升级触发。
- `audit`：决策时间、来源、policy version、source artifacts。

### 3.2 算法

`evaluateLifecycleDecisionGate()` 在 `packages/core/src/lifecycle/decision-gate.ts:54` 实现启发式路由：

1. 先归一化 `LifecycleDecisionSignals`。
2. 计算 hard gates。
3. 如果命中 external unknown 或 architecture decision，则进入 `research`。
4. 如果命中安全、数据库、API schema、状态机并发、CI/build/release 等 full hard gates，则进入 `full`。
5. 如果影响置信度低，则根据是否能 scout impact 选择 `compact` 或 `research`。
6. 如果验收或验证不清晰，则选择 `compact` 或 `research`。
7. 如果满足 direct whitelist，则选择 `direct`。
8. 如果是 bounded compact change，则选择 `compact`。
9. 其他情况进入 `full`。
10. 根据 hard gates、policy hits、permission required、confidence 等计算 checkpoint。
11. 生成 `LifecycleDecisionRecord` 和 autonomy ceiling。

### 3.3 当前边界

当前生命周期模型已经能决定“需求需要多少 SDD”，但它是独立的 lifecycle gate，不等同于后续讨论中的 coding risk policy engine。当前代码里 lifecycle gate、task risk profile、command-team routing 之间存在交叉消费，但还不是一个统一的风险决策内核。

## 4. Task 风险画像模型

### 4.1 数据结构

`TaskRiskProfile` 定义在 `packages/core/src/task-risk-profile.ts:5`，当前字段包括：

- `riskLevel`：`low | medium | high`。
- `rawTags` / `normalizedTags`：原始与归一化风险标签。
- `fileClasses`：文件分类。
- `sourceBoundary`：是否触碰 CLI/core source。
- `runtimeStateBoundary`：是否触碰 `.sdd`、runs、artifacts 等 runtime 状态。
- `docsOnly`：是否仅文档。
- `validationOnly`：是否验证型任务。
- `securitySensitive` / `externalUnknown`。
- `contextRisk` / `tokenRisk` / `performanceRisk`。
- `teamRecommendation`：`none | review-lite | team-required`。
- `approvalRecommendation`：`direct | review | human-checkpoint`。
- `reasons`：风险解释。

### 4.2 算法

`buildTaskRiskProfile()` 在 `packages/core/src/task-risk-profile.ts:34`：

1. 归一化 task risk tags。
2. 根据 `affectedFiles` 计算 `TaskFileClass`。
3. 文件触碰 `packages/cli/src` 或 `packages/core/src` 时标记 source boundary。
4. 文件触碰 `.sdd`、`runs`、`artifacts` 时标记 runtime-state boundary。
5. 根据 tags 推导 security、external、context、token、performance signals。
6. source boundary、高风险 tag、安全敏感或 external unknown 直接定为 high。
7. runtime-state boundary、任意 medium tag 或影响文件数大于 3 定为 medium。
8. 否则定为 low。
9. high 推荐 `team-required` 和 `human-checkpoint`。
10. medium 或需要 review artifact 时推荐 `review-lite` 和 `review`。
11. low 推荐 `none` 和 `direct`。

文件分类算法在 `packages/core/src/task-risk-profile.ts:128`，当前按路径前缀和文件名模式归类。

### 4.3 当前边界

当前 task risk profile 同时包含编码风险、上下文/token/performance 信号、team 推荐和 approval 推荐。因此它是一个混合型任务画像，而不是纯粹 lifecycle/policy 风险模型。它能服务当前 status、routing、ship 等聚合，但还没有把“风险判断”和“agent/team 选择”彻底解耦。

## 5. Command team runtime 模型

### 5.1 数据结构

Command team runtime 定义在 `packages/core/src/registries/command-team-runtime.ts`。主要结构包括：

- `CommandTeamRuntimeCommand`：`spec | plan | tasks | verifies | do | test | verify | sync-back | ship | doctor-deep | recover`，定义在 `packages/core/src/registries/command-team-runtime.ts:8`。
- `CommandTeamMode`：`single | team-lite | team-required | blocked`。
- `CommandTeamActivation`：`auto | force | off`。
- `CommandRoleKind`：`scout | planner | implementer | reviewer | validator | risk-reviewer | summarizer | operator`。
- `CommandRoleProfile`：角色能力域、authority ceiling、material packs、context budget、summary/evidence 要求。
- `CommandTeamRuntimeProfile`：命令级最小模式、升级 risk tags、必选/可选 roles、material policy、telemetry。
- `CommandTeamRuntimeDecision`：命令最终 mode、roles、material packs、independence rules、telemetry policy、reason。

静态 roles 在 `packages/core/src/registries/command-team-runtime.ts:76`，静态 command profiles 在 `packages/core/src/registries/command-team-runtime.ts:88`。

### 5.2 算法

`decideCommandTeamRuntime()` 在 `packages/core/src/registries/command-team-runtime.ts:133`：

1. 先校验 command team runtime 与 capability catalog 的一致性。
2. 查找当前 command profile。
3. 无效或未知 command 时返回 `blocked`。
4. 读取历史 projections 判断是否有 context/token pressure。
5. 将输入 risk tags 与 profile 的 `escalationRiskTags` 精确匹配。
6. 根据 activation 决定 mode：
   - `off`：强制 single。
   - `force`：强制 profile 对应 mode。
   - risk tag escalated：升级到 profile mode。
   - 默认使用 profile minMode。
7. 根据 mode、token pressure、activation 选择 role ids。
8. 根据 role ids 汇总 material pack ids。
9. 根据角色组合匹配 independence rules。
10. 写入 `team_runtime_decision` projection。

role 裁剪逻辑在 `packages/core/src/registries/command-team-runtime.ts:182`：

- `single` 只取第一个 required role。
- 有 token pressure 且不是 force 时，只保留 required roles。
- 否则使用 required + optional roles。

### 5.3 当前边界

当前 command team runtime 是静态 profile + 决策投影，不是真正的 agent/subagent 执行调度器。它没有创建子 agent、没有分配独立上下文窗口、没有后台任务句柄，也没有记录 active handoff。它更像“命令级团队建议与材料装载策略”。

当前命令集合同时存在 `test` 和 `verify` profile，说明代码内部仍保留测试执行和证据判断分离的历史形态。

## 6. Context package 模型

### 6.1 数据结构

`ContextBuildPackage` 定义在 `packages/core/src/context/build-package.ts:13`。当前字段包括：

- `profile`：context profile。
- `mode`：`do | verify | sync-back | doctor`。
- `agent` / `role`：请求方 agent 名称与归一化角色。
- `authoritative: false`。
- `usableForPass: false`。
- `taskId` / `branch`。
- `budget`：`ContextBudgetAccounting`。
- `mustRead` / `optionalRead` / `doNotReadUnlessNeeded`。
- `nextCommands`。
- `warnings`。

`ContextBudgetAccounting` 定义在 `packages/core/src/context/build-package.ts:38`，记录 max bytes、estimated bytes/tokens、included/deferred/excluded refs 和 truncated summaries。

### 6.2 算法

`buildContextBuildPackage()` 在 `packages/core/src/context/build-package.ts:57`：

1. 解析 branch 和 SDD task model。
2. inspect task，确认 task 存在。
3. 根据 agent 名称推导 role。
4. 构造文档 refs、affected file refs、required artifact refs、route cache ref、run-index ref。
5. 按 mode/role 分成 must / optional / deferred refs。
6. 根据 profile 对应 budget 执行 `applyContextBudget()`。
7. 构建非权威 context package。
8. 强制控制输出 JSON 体积。
9. 写入 `context_build` projection。

`applyContextBudget()` 在 `packages/core/src/context/build-package.ts:105`：

- must refs 优先进入 included；如果超 budget，但 mustRead 为空则至少保留一个。
- optional refs 在 budget 内才 included，否则 deferred。
- deferred refs 去重后保留到 `doNotReadUnlessNeeded`。
- accounting 中截断过长的 deferred/excluded summaries。

`enforceContextPackageOutputBudget()` 在 `packages/core/src/context/build-package.ts:186`：

- 先移除 optional refs。
- 再移除 deferred refs。
- 再裁剪 accounting 里的 excluded/deferred summaries。
- 最后更新 estimated bytes/tokens。

### 6.3 当前边界

当前 context package 是“面向角色和命令的上下文读取建议”，明确 `authoritative=false`、`usableForPass=false`。它不能作为 PASS 证据。

实现上仍以 budget、byte estimate、token estimate 和 trimming 为核心机制；它还不是基于 Claude-style subagent isolation 的 context offload runtime。

## 7. Runtime store 与 projection 模型

### 7.1 数据结构

Runtime store 定义在 `packages/core/src/storage/runtime-store.ts`，当前 schema version 是 `2`，contract 是 `phase-7.2-runtime-store-v2`，见 `packages/core/src/storage/runtime-store.ts:8`。

SQLite schema 在 `packages/core/src/storage/runtime-store.ts:105` 初始化，主要表包括：

- `runtime_meta`：schema 和 contract 元信息。
- `runs`：run state 快照。
- `events`：run event 日志。
- `attempts`：尝试记录。
- `activities`：命令 / agent / worker 等 invocation ledger 投影。
- `artifacts`：run artifacts。
- `artifact_ingestions`：artifact ingestion 结果。
- `policy_decisions`：policy decision 记录。
- `evidence_claims`：AC evidence claims。
- `evidence_attachments`：证据附件。
- `gaps`：gap 记录。
- `recovery_actions`：恢复动作。
- `source_snapshots`：source snapshot。
- `projections`：派生视图。
- `legacy_imports`：legacy JSONL 导入状态。
- `test_runs`：测试运行。
- `test_steps`：测试步骤。

### 7.2 算法

`withRuntimeStore()` 在 `packages/core/src/storage/runtime-store.ts:48` 统一打开 store、执行回调并关闭连接。

当前打开 store 时会：

1. 创建 `.sdd` 目录。
2. 动态加载 `node:sqlite`。
3. 设置 foreign keys、busy timeout、WAL。
4. 初始化 schema。
5. 检查当前 user_version 不高于支持版本。
6. 写入 runtime meta。

`recordRuntimeProjection()` 在 `packages/core/src/storage/runtime-store.ts:234` 使用 `INSERT OR REPLACE` 按 `projection_type + scope_key` 写入派生视图。

### 7.3 当前边界

Runtime store 当前是运行事实和 projection 的统一查询面，但没有独立的 workflow handoff 表，也没有 subagent dispatch/session/result 表。现有 `activities`、`artifact_ingestions`、`projections` 可以承载部分 agent/worker 事实，但不是显式 subagent runtime schema。

## 8. `/sdd:test` 测试运行模型

### 8.1 数据结构

`SddTestResult` 定义在 `packages/core/src/verification/test-runtime.ts:48`，包含：

- `runId` / `testRunId`。
- `branch` / `taskId`。
- `status`：`PASS | FAIL | BLOCKED`。
- `verifyContractStatus`。
- `commands`。
- `steps`：每条命令的执行步骤。
- `validationArtifact`。
- `indexArtifact`。
- `gaps`。
- `next`。

单步结构 `SddTestCommandStep` 定义在 `packages/core/src/verification/test-runtime.ts:26`，记录 command、argv、shell、acceptance refs、状态、exit code、duration、stdout/stderr bytes、输出 artifact、是否截断。

### 8.2 算法

`runSddTest()` 在 `packages/core/src/verification/test-runtime.ts:73`：

1. 解析 SDD context 和 task model。
2. 找到 task。
3. inspect verify contract。
4. 创建或读取 run state，并将 run 绑定到 task。
5. 规范化命令输入。
6. 写入 `test_runtime_started` event。
7. 如果 task 不存在、verify contract blocked、没有验证命令，则记录 gaps。
8. 创建 `test_runs` 初始 RUNNING 记录。
9. 若没有 gaps，逐条执行命令。
10. 每条命令写 output artifact、invocation ledger、runtime test step。
11. 根据 gaps 和 steps 推导总状态。
12. 写 validation artifact 和 index artifact。
13. 更新 `test_runs`、写 `test_runtime` projection。
14. 将测试 evidence 回写到 run state。
15. 追加 passed/failed event。
16. 返回 `SddTestResult`。

命令执行层使用 `spawn`，支持 argv 和 shell 两种输入；输出捕获有 `MAX_CAPTURE_BYTES` 限制。

### 8.3 当前边界

当前 `/sdd:test` 已承担命令执行、测试证据 artifact、runtime test 表和 run-state evidence 更新。但 `next` 字段在 PASS 时仍返回 `sdd verify task ...`，见 `packages/core/src/verification/test-runtime.ts:184`，说明用户入口的 test+verify 合并尚未完全反映到内部流程和 CLI 文案。

## 9. Verify / evidence / sync-back 当前位置

当前验证链路由多个模块共同承担：

- `verification/test-runtime.ts`：执行验证命令并收集 evidence。
- `verification/verify-contract.ts`：检查 verify contract 状态。
- `verification/goal-verify.ts`：判断 acceptance coverage、reviewer/validator artifact、policy/provenance/ledger corroboration，并生成 sync-back proposal。
- `sync-back/inspect.ts`：检查 stale docs、conflicts、verify freshness、proposal digest 和 apply policy。

因此当前 “test” 和 “verify” 在实现上仍是两段：

```text
test runtime: command execution + evidence capture
verify / goal verify: evidence 是否证明 AC + sync-back proposal
```

这反映的是当前代码事实，不代表后续用户入口应继续暴露两个 slash stage。

## 10. Ship readiness 模型

### 10.1 数据结构

`ShipResult` 定义在 `packages/core/src/lifecycle/ship.ts:14`，包含：

- `branch`。
- `status`：`PASS | BLOCKED`。
- `dryRun`、`releasePath`、`wroteRelease`。
- `checks`：readiness checks。
- `nextActions`。
- `projectStatus` 摘要。
- `doctor` 摘要。
- `releaseDocument`。

### 10.2 算法

`runShip()` 在 `packages/core/src/lifecycle/ship.ts:43`：

1. 获取 project status。
2. 运行 latest-only doctor。
3. 构建 ship checks。
4. 任一 check BLOCKED，则 ship status 为 BLOCKED。
5. 生成 `release.md` 文本。
6. 非 dry-run 时写入 release 文档。
7. 返回 `ShipResult`。

`buildShipChecks()` 在 `packages/core/src/lifecycle/ship.ts:84`，当前检查项包括：

- `documents`：spec / plan / tasks / verify 是否存在。
- `workflow_gaps`：是否有 blocking gaps。
- `doctor_fast`：doctor 是否 PASS。
- `latest_run`：最新 run 是否 completed、validation pass、sync-back 不为 proposed。
- `evidence_health`：是否存在 stale reasons 或 affected file conflicts。
- `token_health`：token projection 是否 pressure。

### 10.3 当前边界

Ship 是本地 readiness 和 release summary，不做 publish、push、tag、deploy。当前 readiness 仍显式把 `token_health=pressure` 作为 BLOCKED 条件，见 `packages/core/src/lifecycle/ship.ts:119`。这说明当前实现仍使用 token health 作为发布门禁的一部分。

## 11. Status / doctor 聚合边界

当前 status 和 doctor 是 runtime 健康与工作流状态的聚合面：

- status 聚合 workflow state、task risk、latest run、latest evidence、context/token projection 等信息。
- doctor 聚合项目结构、runtime store、registry、contract、context/token 等检查。
- ship 依赖 status 和 doctor 的结果做 release readiness。

这三者共同构成当前的“只读诊断 / 门禁聚合层”。它们不直接执行任务实现，不直接调度 subagent，也不持有阶段控制权。

## 12. 当前实现中的 agent / skill / team 能力边界

当前代码已经有静态 agent capability、skill capability、command-team runtime、worker/adapter 等 registry 概念，但其运行形态主要是：

```text
capability catalog / command profile / material pack / runtime projection
```

而不是：

```text
spawn subagent -> subagent isolated context -> background execution -> result summary -> parent integration
```

当前 command team 的 roles 要求 `summaryOnly`，material packs 有 context budget，independence rules 可表达验证设计与证据执行要区分。但这些规则当前主要用于校验、推荐、projection 和命令输出，不是完整执行编排。

## 13. 当前核心数据结构清单

| 结构 | 文件 | 当前职责 |
|---|---|---|
| `LifecycleDecisionRecord` | `packages/core/src/lifecycle/decision-gate.ts` | lifecycle profile、hard gates、checkpoint、autonomy ceiling |
| `TaskRiskProfile` | `packages/core/src/task-risk-profile.ts` | task 级风险画像、文件分类、team/approval 推荐 |
| `CommandRoleProfile` | `packages/core/src/registries/command-team-runtime.ts` | 静态 command role 能力与材料约束 |
| `CommandTeamRuntimeProfile` | `packages/core/src/registries/command-team-runtime.ts` | command 到 roles/material policy/telemetry 的静态配置 |
| `CommandTeamRuntimeDecision` | `packages/core/src/registries/command-team-runtime.ts` | 单次 command team runtime 决策 projection |
| `ContextBuildPackage` | `packages/core/src/context/build-package.ts` | mode/role scoped context 读取建议 |
| `ContextBudgetAccounting` | `packages/core/src/context/build-package.ts` | context bytes/tokens/deferred/truncated 计量 |
| `WorkflowStateResolution` | `packages/core/src/workflow-state/resolve.ts` | 文档 + run state + conflict 的工作流聚合视图 |
| `SddTestResult` | `packages/core/src/verification/test-runtime.ts` | 测试命令执行结果与 evidence artifact 索引 |
| `ShipResult` | `packages/core/src/lifecycle/ship.ts` | release readiness 聚合结果 |
| Runtime store schema | `packages/core/src/storage/runtime-store.ts` | runs/events/evidence/projections/test runs/test steps 等持久化 |

## 14. 当前主要算法清单

| 算法 | 入口 | 当前行为 |
|---|---|---|
| 生命周期路由 | `evaluateLifecycleDecisionGate()` | 根据 hard gates、置信度、验收/验证清晰度选择 direct/compact/full/research |
| task 风险分类 | `buildTaskRiskProfile()` | 根据 risk tags 和 affected files 输出风险等级、team/approval 推荐 |
| command team 决策 | `decideCommandTeamRuntime()` | 校验静态 profiles，按 activation/risk tags/token pressure 选择 mode 和 roles |
| context 选择 | `buildContextBuildPackage()` | 根据 task、mode、role 选择 must/optional/deferred refs 并写 projection |
| context budget 裁剪 | `applyContextBudget()` / `enforceContextPackageOutputBudget()` | 按 bytes budget 纳入或延后 refs，并控制输出体积 |
| runtime store 写入 | `recordRuntimeProjection()` 等 | 将派生视图、events、test runs、test steps 等写入 SQLite |
| workflow state 解析 | `resolveWorkflowState()` | 解析文档和 run states，计算 gaps/conflicts/next command |
| test runtime | `runSddTest()` | 执行验证命令，记录 artifacts、test tables、projection 和 run-state evidence |
| ship readiness | `runShip()` / `buildShipChecks()` | 聚合 status + doctor，按 checks 判断 PASS/BLOCKED |

## 15. 当前 as-is 边界与限制

以下是当前代码已经呈现出的边界，不是后续实施计划：

1. **生命周期决策存在，但风险模型未完全独立化。**
   - `LifecycleDecisionRecord` 管生命周期 profile。
   - `TaskRiskProfile` 管 task 风险画像。
   - command team 也消费 risk tags。
   - 三者目前有关联但不是统一的 lifecycle risk policy engine。

2. **command team 是静态 runtime profile，不是实际多 agent runtime。**
   - 当前能产出 mode、roleIds、materialPackIds、independence rules。
   - 当前不能代表真实 subagent 创建、后台执行、上下文隔离或结果回传。

3. **context package 是上下文建议，不是权威证据。**
   - `authoritative=false`。
   - `usableForPass=false`。
   - 它不会直接影响 PASS 结论。

4. **context/token 仍是实现层显式概念。**
   - context package 有 budget accounting。
   - command team 会检测 token pressure 并裁掉 optional roles。
   - ship readiness 有 token health gate。

5. **test 与 verify 在内部仍分离。**
   - `runSddTest()` 执行命令并收集 evidence。
   - PASS 后的 next 仍指向 `sdd verify task`。
   - goal verify / sync-back proposal 是另一段逻辑。

6. **workflow state 是推导视图，不是 active agent handoff state。**
   - 当前根据文档、run states 和 conflicts 推导 next command。
   - 没有 stage owner、handoff packet、handoff audit 的一等模型。

7. **runtime store 是事实/投影存储，不是 agent orchestration store。**
   - 有 runs、events、activities、artifacts、evidence、test_runs、test_steps、projections。
   - 没有专门的 subagent session、handoff、background dispatch 表。

## 16. 结论

当前 Phase 7 后的代码架构已经形成了比较完整的 SDD runtime 骨架：

```text
SDD docs -> task model -> lifecycle/risk/context/team projections -> run-state/runtime-store -> status/doctor/ship
```

它的强项是：

- 文档和运行事实分离。
- run-state 与 SQLite runtime store 双轨记录。
- lifecycle gate、task risk、context package、team runtime、test runtime、ship readiness 都有明确 contract 形态。
- 多数派生判断通过 projection 留痕，方便 status/doctor/ship 聚合。

它的当前真实边界是：

- agent/team 仍主要是静态 profile 和 decision，不是完整执行 runtime。
- context/token 优化仍是 budget/trimming/pressure 模型。
- test/verify 在内部仍分段。
- 风险、team、approval、token/context 信号仍有混合。
- workflow 推进仍是 command recommendation，不是 specialist active-agent handoff。

因此，当前代码不是“纯文档流程”，也还不是“完整多 agent 编排平台”；它处在 SDD runtime fact store、projection、门禁和验证链路已经成型，但 agent handoff、Claude-style subagent dispatch、独立 lifecycle risk policy 尚未成为一等 runtime 模型的阶段。
