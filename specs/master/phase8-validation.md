# Phase 8 Validation Cases

## 1. Coverage conclusion

Phase 8 的真实用户验证 case 已覆盖主链路闭环，但风险模型和 agent/subagent 需要按更多真实 coding 变更形态持续扩展。本文件记录 baseline 场景与调研后补充的扩展场景，避免只用 database/security/subagent timeout 这类少数样本代表全部风险。

本文件用于记录 Phase 8 目标效果对应的真实验证场景清单。验证原则是：用户不需要调用 `sdd stage handoff`、`sdd subagent dispatch`、`sdd context offload` 这类额外生命周期命令；Phase 8 能力应通过现有 workflow 命令自动产生、消费和阻断。

调研补充原则：风险模型按代码变更的 blast radius、影响面、证据充分性、人审要求和回滚难度分层；agent/subagent 按 handoff、并行、非阻塞、context offload、失败恢复和结果权威性分层。验证不只看“命令是否 PASS”，还要看风险分类是否正确、门禁是否在正确阶段阻断、失败提示是否能指导用户恢复。

## 2. Phase 8 target effects

### 2.1 Phase 8.1 Contract and projection foundation

目标效果：

- Runtime 使用稳定 contract、producer version、projection store 记录 workflow 事实。
- 旧项目或缺失 projection 时保持 absent-safe，不因为 Phase 8 数据不存在而崩溃。
- `status`、`doctor`、`ship --dry-run` 能读取 projection 并给出可解释结果。

### 2.2 Phase 8.2 Lifecycle risk decision

目标效果：

- 风险决策模型与 lifecycle 绑定，不和 agent/subagent 模型混在一起。
- 风险输入来自 task 风险标签、任务结构、变更范围、证据要求和 lifecycle 状态。
- 决策输出包括 `profile`、`approvalPolicy`、required stages、blocked stages、required evidence、human checkpoint。
- `route`、execution、test、sync-back、ship 消费同一风险决策。

### 2.3 Phase 8.3 Stage and handoff runtime

目标效果：

- workflow 阶段进入 runtime state，而不是只存在于文档和 prompt 中。
- stage owner 完成阶段后生成 handoff，下一阶段只能在 gate 满足时继续。
- handoff gate 能被 risk、evidence、context offload、blocking subagent 状态阻断。

### 2.4 Phase 8.4 Work unit runtime

目标效果：

- agent/subagent 工作被建模为 work unit。
- 主 agent 的 work unit 可以影响阶段推进。
- subagent 的 work unit 默认 non-authoritative，不直接决定 lifecycle。
- failed/blocked work unit 能被 status/doctor/ship 看见。

### 2.5 Phase 8.5 Context offload runtime

目标效果：

- context load 不是单纯预算阈值，而是 workflow 内的 context 管理决策。
- `normal` 走 inline。
- `elevated` 走 summarize。
- `high` 走 dispatch-subagent。
- `overloaded` 走 block-for-curation。
- offload 决策自动进入 workflow gate，不要求用户新增命令。

### 2.6 Phase 8.6 Subagent runtime

目标效果：

- subagent 用于并行提效、非阻塞辅助任务、context 分流。
- subagent 形态偏 Claude 官方 subagent：由主流程调度，输出 evidence/result。
- subagent 不直接改 workflow lifecycle，不直接执行 sync-back/ship，不独立控制阶段。
- blocking subagent 失败会阻断 gate；non-blocking subagent 不应阻断主流程。

### 2.7 Phase 8.7 `/sdd:test` unified validation

目标效果：

- 测试和验证统一在 `/sdd:test` / `sdd test task` 中完成。
- command evidence 必须映射 acceptance refs。
- command PASS 但 evidence coverage 缺失时不能给 policy PASS。
- evidence PASS 且 orchestration gate PASS 后才允许 sync-back ready。

### 2.8 Phase 8.8 Sync-back gate

目标效果：

- sync-back inspect/apply 消费 test evidence 和 orchestration gate。
- run 未完成、evidence stale、risk 未批准、handoff blocked、blocking subagent 未完成时不能 apply。
- 简单任务可 PASS 后自动 apply；复杂/高风险任务需要显式批准。

### 2.9 Phase 8.9 Status/doctor/ship visibility

目标效果：

- `status` 展示 risk profile、approval policy、stage、handoff、context action、subagent health、latest run。
- `doctor` 检查 missing/stale projection、risk blocked、handoff blocked、context overloaded、subagent failed。
- `ship --dry-run` 把 orchestration gate 作为发布前真实门禁。

### 2.10 Phase 8.10 Orchestration closure

目标效果：

- Phase 8 primitive 不再只是 observe/diagnose，而是被主链路消费。
- `sdd do task`、`sdd background run`、`sdd test task`、`sdd sync-back inspect/apply`、`sdd ship --dry-run` 形成闭环。
- database/security/manual gate 有显式批准通道：`--approved`。
- 真实 Claude Code host worker 可通过 `sdd background run --worker claude-code-subagent-worker` 执行并产生可 ingest 的 artifact。
- 命令面保持干净，不新增 `stage handoff`、`subagent dispatch`、`context offload` 生命周期命令。

## 3. Real user validation rounds

### Round A: Installed package and project bootstrap

#### A1. Package dry-run

用户场景：用户发布前确认 npm package 内容可安装。

步骤：

```text
npm pack --dry-run --json
```

期望结果：

- 命令 PASS。
- package 中包含 CLI dist、core dist、skills/templates 必要文件。
- 不包含临时测试输出或本地敏感文件。

覆盖目标：Phase 8.1、Phase 8.9、Phase 8.10。

#### A2. Installed CLI init smoke

用户场景：用户在临时真实项目中安装当前包并初始化 SDD。

步骤：

```text
npm install <packed-tgz>
sdd init
sdd status
sdd doctor
```

期望结果：

- `sdd init` 创建 `.sdd/project.yml`、`specs`、runtime state 基础结构。
- `sdd status` 能在新项目 absent-safe 输出状态。
- `sdd doctor` 对缺失 workflow 给出可解释 WARN/FAIL，不崩溃。

覆盖目标：Phase 8.1、Phase 8.9。

### Round B: Lifecycle risk and approval gate

#### B1. Direct/compact/full risk classification

用户场景：用户对不同复杂度任务运行 route/status，确认 lifecycle profile 不同。

步骤：

```text
sdd route task <simple_task> --branch master --json
sdd route task <multi_stage_task> --branch master --json
sdd status --branch master --json
```

期望结果：

- 简单任务得到较低 profile，如 `direct` 或 `compact`。
- 多阶段/高影响任务得到 `full` 或更高 profile。
- status 展示 lifecycle risk decision。

覆盖目标：Phase 8.2、Phase 8.9。

#### B2. Manual-risk task blocks without approval

用户场景：任务包含 `database` 或 security 风险，用户未显式批准。

步骤：

```text
sdd do task <database_task> --branch master --review-artifact artifacts/review.md --validation-artifact artifacts/validation.md
sdd background run <database_task> --branch master --artifact artifacts/implementer.md
```

期望结果：

- route/execution 返回 blocked。
- blocking reason 包含 human approval、manual isolation 或 governance confirmation。
- run state 不能被标记 completed。
- sync-back inspect 不 ready。

覆盖目标：Phase 8.2、Phase 8.8、Phase 8.10。

#### B3. Manual-risk task passes with `--approved`

用户场景：用户已经人工确认高风险任务允许继续执行。

步骤：

```text
sdd do task <database_task> --branch master --approved --review-artifact artifacts/review.md --validation-artifact artifacts/validation.md
sdd background run <database_task> --branch master --approved --artifact artifacts/implementer.md
```

期望结果：

- `--approved` 被传入 route、isolation、governance 和 background executor。
- manual gate 不再无条件阻断。
- artifact ingestion 可完成。
- route cache 不复用未批准时的 blocked decision。

覆盖目标：Phase 8.2、Phase 8.10。

#### B4. Approval cannot bypass hard blocked risk

用户场景：任务命中明确 forbidden/broken boundary，用户传入 `--approved`。

步骤：

```text
sdd do task <blocked_task> --branch master --approved
sdd ship --dry-run --branch master
```

期望结果：

- hard blocked risk 仍然 BLOCKED。
- `--approved` 只解除 human-required/manual gate，不解除 forbidden policy。

覆盖目标：Phase 8.2、Phase 8.9、Phase 8.10。

#### B5. Public API / contract change requires broader validation

用户场景：用户修改导出的 CLI/API、配置 schema、artifact contract 或 package export。

步骤：

```text
sdd route task <api_contract_task> --branch master --json
sdd test task <api_contract_task> --branch master
sdd ship --dry-run --branch master
```

期望结果：

- lifecycle profile 至少为 `full` 或需要 review-required。
- required stages 包含 spec/plan/tasks/do/test/sync-back，而不是 direct。
- `/sdd:test` 不能只接受单个 unit command；需要 contract/schema/CLI regression evidence。
- ship 检查能看到 contract/API 风险的证据状态。

覆盖目标：Phase 8.2、Phase 8.7、Phase 8.9、Phase 8.10。

#### B6. Build/dependency/config change requires environment and rollback evidence

用户场景：用户修改 `package.json`、lockfile、tsconfig、CI 配置、发布配置或 runtime adapter 配置。

步骤：

```text
sdd route task <build_config_task> --branch master --json
sdd test task <build_config_task> --branch master
sdd sync-back inspect <run_id> --branch master
```

期望结果：

- 风险模型识别 build/dependency/config blast radius。
- validation 至少包含 build/typecheck/package dry-run 或对应环境检查。
- 缺少 rollback/recovery 说明时 sync-back 或 ship 给出 WARN/BLOCKED。

覆盖目标：Phase 8.2、Phase 8.7、Phase 8.8、Phase 8.9。

#### B7. Data/schema/migration risk cannot be treated as normal source edit

用户场景：任务涉及 migration、runtime.sqlite schema、数据迁移、持久化 state contract 或不可逆写入。

步骤：

```text
sdd route task <schema_task> --branch master --json
sdd background run <schema_task> --branch master
sdd background run <schema_task> --branch master --approved
```

期望结果：

- 未批准时 human-required/manual gate BLOCKED。
- `--approved` 只解除人工确认，不跳过 test/evidence/sync-back gate。
- evidence 需要 dry-run、rollback 或 compatibility 检查；不能只凭 implementer artifact PASS。

覆盖目标：Phase 8.2、Phase 8.7、Phase 8.8、Phase 8.10。

#### B8. Security/auth/permission change requires hard evidence and cannot be silently auto-applied

用户场景：用户修改权限、认证、token、secret、sandbox、permission mode 或外部凭证相关逻辑。

步骤：

```text
sdd route task <security_task> --branch master --json
sdd do task <security_task> --branch master --approved
sdd sync-back apply <run_id> --branch master
```

期望结果：

- route 输出 human-required 或 blocked/review-required，并说明安全原因。
- apply 需要 explicit approval 和 security validation evidence。
- 缺少 evidence 时即使命令执行成功也不能 syncBackReady。

覆盖目标：Phase 8.2、Phase 8.7、Phase 8.8、Phase 8.10。

#### B9. Broad refactor / overlapping files escalates from compact to full

用户场景：用户做跨模块重命名、目录迁移、barrel export 移除、核心抽象调整。

步骤：

```text
sdd route task <broad_refactor_task> --branch master --json
sdd status --branch master --json
sdd sync-back inspect <run_id> --branch master
```

期望结果：

- 风险模型根据 affected_files、source-boundary、consumer impact 升级到 full。
- affected file conflict 或 stale run 会阻断 sync-back。
- status 显示需要更完整 validation，而不是按单文件小改自动推进。

覆盖目标：Phase 8.2、Phase 8.8、Phase 8.9。

#### B10. Test-only / documentation-only changes remain direct when evidence is sufficient

用户场景：用户只修改测试、文档、示例或非发布路径说明。

步骤：

```text
sdd route task <docs_or_test_task> --branch master --json
sdd test task <docs_or_test_task> --branch master
sdd sync-back inspect <run_id> --branch master
```

期望结果：

- 风险模型允许 direct/compact，不强制 full SDD。
- validation 仍需 AC 映射；缺映射时 `/sdd:test` BLOCKED。
- PASS 后简单任务可进入 auto/smooth sync-back 路径。

覆盖目标：Phase 8.2、Phase 8.7、Phase 8.8、Phase 8.10。

#### B11. Unknown impact / missing acceptance escalates to research or blocked

用户场景：用户描述含糊，或任务没有 acceptance refs / validation commands / affected files。

步骤：

```text
sdd route task <ambiguous_task> --branch master --json
sdd test task <ambiguous_task> --branch master
sdd doctor --latest-only --branch master
```

期望结果：

- intent/acceptance unknown 时 blocked。
- external/unknown-impact 且 confidence 低时 research。
- doctor 给出补 spec/tasks/verify 的具体下一步，而不是误报为某个业务字段未确认。

覆盖目标：Phase 8.2、Phase 8.7、Phase 8.9。

#### B12. Stale risk projection after task/doc change must force re-evaluation

用户场景：用户已经 route/test 过任务，但随后修改 tasks.md、verify.md 或风险标签。

步骤：

```text
sdd status --branch master --json
sdd route task <task_id> --branch master --json
sdd ship --dry-run --branch master
```

期望结果：

- stale/incompatible lifecycle projection 不被当作 fresh。
- route cache 不复用旧 input hash 的低风险结果。
- ship 在 risk projection stale 时 WARN/BLOCKED 并提示 reroute/retest。

覆盖目标：Phase 8.1、Phase 8.2、Phase 8.9、Phase 8.10。

### Round C: Stage, handoff, and work unit

#### C1. Main agent execution creates stage/work-unit projections

用户场景：用户执行一个正常 task。

步骤：

```text
sdd background run <task_id> --branch master --artifact artifacts/implementer.md
sdd status --branch master --json
```

期望结果：

- runtime 记录 StageRun。
- runtime 记录 WorkUnit。
- WorkUnit 与 task、agent、artifact、delegation id 可关联。
- status 能展示 active/latest stage 和 work-unit health。

覆盖目标：Phase 8.3、Phase 8.4、Phase 8.9、Phase 8.10。

#### C2. Failed work unit blocks gate

用户场景：agent artifact 返回 FAIL/BLOCKED。

步骤：

```text
sdd background run <task_id> --branch master --artifact artifacts/failing-implementer.md
sdd doctor --latest-only --branch master
sdd ship --dry-run --branch master
```

期望结果：

- WorkUnit 状态为 failed/blocked。
- doctor 报告 FAIL。
- ship dry-run BLOCKED。

覆盖目标：Phase 8.4、Phase 8.9。

#### C3. Handoff requires evidence and clear gates

用户场景：上一阶段输出不足或 evidence 缺失。

步骤：

```text
sdd sync-back inspect <run_id> --branch master
sdd ship --dry-run --branch master
```

期望结果：

- handoff gate 因 required evidence 缺失阻断。
- sync-back 不 ready。
- ship 不放行。

覆盖目标：Phase 8.3、Phase 8.8、Phase 8.9。

### Round D: Context offload

#### D1. Normal context remains inline

用户场景：小任务 context 负载正常。

步骤：

```text
sdd context build --task <small_task> --branch master --mode do
sdd status --branch master --json
```

期望结果：

- context action 为 inline/normal。
- 不创建 blocking subagent dispatch。
- token/context health nominal。

覆盖目标：Phase 8.5、Phase 8.9。

#### D2. Elevated context summarizes without blocking

用户场景：中等任务触发 summarize。

步骤：

```text
sdd context build --task <medium_task> --branch master --mode do
sdd status --branch master --json
```

期望结果：

- context action 为 summarize。
- summary refs 可见。
- 主 workflow 不因 summarize 阻断。

覆盖目标：Phase 8.5。

#### D3. High context creates dispatch-subagent decision

用户场景：任务上下文过大，需要 subagent 分流。

步骤：

```text
sdd background run <large_task> --branch master
sdd status --branch master --json
sdd doctor --latest-only --branch master
```

期望结果：

- ContextOffloadDecision action 为 dispatch-subagent。
- 自动创建 SubagentDispatch/WorkUnit projection。
- 如果 requiredBefore=handoff，则 handoff/sync-back/ship 等待该 dispatch 完成。
- 用户不需要调用 `sdd context offload` 或 `sdd subagent dispatch`。

覆盖目标：Phase 8.5、Phase 8.6、Phase 8.10。

#### D4. Overloaded context blocks for curation

用户场景：context 已过载，自动摘要/分流不足以保证安全。

步骤：

```text
sdd status --branch master --json
sdd doctor --latest-only --branch master
sdd ship --dry-run --branch master
```

期望结果：

- context action 为 block-for-curation。
- doctor FAIL 或明确 BLOCKED。
- ship dry-run BLOCKED。

覆盖目标：Phase 8.5、Phase 8.9。

### Round E: Subagent runtime

#### E1. Non-blocking subagent does not block main workflow

用户场景：subagent 执行日志分析、辅助测试、摘要等非阻塞任务。

步骤：

```text
sdd background run <task_id> --branch master --worker claude-code-subagent-worker --timeout-seconds 120
sdd status --branch master --json
```

期望结果：

- SubagentDispatch/Result 被记录。
- non-blocking subagent 未完成时，主流程可继续。
- status 显示 subagent health，但不把它作为 hard blocker。

覆盖目标：Phase 8.6、Phase 8.9、Phase 8.10。

#### E2. Blocking subagent failure blocks handoff/ship

用户场景：context offload 或 handoff 前置要求创建 blocking subagent。

步骤：

```text
sdd background run <task_id> --branch master --worker claude-code-subagent-worker --timeout-seconds 1
sdd doctor --latest-only --branch master
sdd ship --dry-run --branch master
```

期望结果：

- SubagentDispatch 为 failed/blocked。
- doctor FAIL。
- ship dry-run BLOCKED。
- failure reason 可追溯到 dispatch/result。

覆盖目标：Phase 8.6、Phase 8.9。

#### E3. Subagent result remains non-authoritative

用户场景：subagent 输出 PASS，但主 validation 未完成。

步骤：

```text
sdd background inspect <run_id> --json
sdd sync-back inspect <run_id> --branch master
```

期望结果：

- SubagentResult 可作为 evidence/provenance。
- 不能单独让 lifecycle completed。
- 不能绕过 `/sdd:test` acceptance evidence。

覆盖目标：Phase 8.6、Phase 8.7、Phase 8.8。

#### E4. Subagent does not require independent worktree lifecycle

用户场景：用户按当前设计运行 subagent。

步骤：

```text
sdd background run <task_id> --branch master --worker claude-code-subagent-worker
sdd doctor --latest-only --branch master
```

期望结果：

- subagent 通过主 workflow 的 delegation/runtime 执行。
- 不要求 subagent 独立控制 worktree lifecycle。
- database/security manual gate 仍由主流程批准模型控制。

覆盖目标：Phase 8.6、Phase 8.10。

#### E5. Parallel subagents produce independent evidence without lifecycle ownership

用户场景：主流程同时分派多个 subagent 做日志分析、测试建议、文档一致性检查。

步骤：

```text
sdd background run <task_id> --branch master --worker claude-code-subagent-worker --json
sdd background run <task_id> --branch master --worker claude-code-subagent-worker --json
sdd status --branch master --json
```

期望结果：

- 每个 subagent 有独立 dispatch/result/workUnit id。
- 多个 subagent 可并行记录 evidence candidate。
- 主流程只消费 reviewed/ingested evidence，不让 subagent 直接完成 lifecycle。

覆盖目标：Phase 8.4、Phase 8.6、Phase 8.9、Phase 8.10。

#### E6. Non-blocking subagent finishes late and does not stall sync-back

用户场景：主 agent 已完成 `/sdd:test` 和 sync-back，后台非阻塞 subagent 晚到。

步骤：

```text
sdd test task <task_id> --branch master
sdd sync-back inspect <run_id> --branch master
sdd background inspect <subagent_run_id> --json
```

期望结果：

- non-blocking dispatch `requiredBefore=never` 不阻断 sync-back/ship。
- late result 只能作为 supplementary evidence/provenance。
- status 显示健康状态，不把 late non-blocking 结果变成 hard blocker。

覆盖目标：Phase 8.6、Phase 8.8、Phase 8.9、Phase 8.10。

#### E7. Blocking subagent retry supersedes earlier failed dispatch

用户场景：真实 host worker 第一次 timeout，用户 rerun 成功。

步骤：

```text
sdd background run <task_id> --branch master --worker claude-code-subagent-worker --timeout-seconds 1 --json
sdd background run <task_id> --branch master --worker claude-code-subagent-worker --timeout-seconds 120 --json
sdd doctor --latest-only --branch master
sdd ship --dry-run --branch master
```

期望结果：

- 旧 failed dispatch 被 newer successful dispatch supersede。
- doctor/status 展示 `superseded` 计数。
- ship 不再被旧 failed dispatch 阻断。

覆盖目标：Phase 8.6、Phase 8.9、Phase 8.10。

#### E8. Archived failed subagent no longer blocks doctor/ship

用户场景：用户确认一次失败 subagent run 是探索性失败，执行 archive。

步骤：

```text
sdd run archive <failed_run_id> --reason "superseded failed subagent smoke"
sdd doctor --latest-only --branch master
sdd ship --dry-run --branch master
```

期望结果：

- archived run 下的 dispatch/result 不再作为 active blocker。
- doctor/status/ship 显示 `archived` 计数和 unblocked 状态。
- 历史证据保留，可通过 deep/all-runs 诊断查看。

覆盖目标：Phase 8.1、Phase 8.6、Phase 8.9、Phase 8.10。

#### E9. Subagent malformed/empty output is visible but recoverable

用户场景：host worker 输出为空、格式错误、缺少 `sdd-result` 或 artifact 路径不匹配。

步骤：

```text
sdd background run <task_id> --branch master --worker claude-code-subagent-worker --json
sdd background inspect <run_id> --json
sdd doctor recover --branch master --json
```

期望结果：

- ingestion/resultStatus 不被误判 PASS。
- failure reason 包含 malformed/empty/missing artifact 等具体原因。
- recover 给出 rerun、archive 或补 artifact 的确定性建议，不自动伪造 PASS。

覆盖目标：Phase 8.6、Phase 8.7、Phase 8.9。

#### E10. Agent handoff chain covers do -> test -> sync-back -> ship

用户场景：多个主 agent/specialist 分阶段推进，一个阶段完成后交给下一个阶段。

步骤：

```text
sdd background run <task_id> --branch master --artifact artifacts/implementer.md
sdd test task <task_id> --branch master
sdd sync-back inspect <run_id> --branch master
sdd ship --dry-run --branch master
```

期望结果：

- do 阶段 StageRun completed 后产生 handoff。
- test 阶段只能在 handoff/risk/context/subagent gate 满足时推进。
- sync-back 和 ship 消费同一 orchestration state，不靠 subagent 自评放行。

覆盖目标：Phase 8.3、Phase 8.4、Phase 8.7、Phase 8.8、Phase 8.9、Phase 8.10。

### Round F: Real Claude Code host invocation

#### F1. Real host worker completes by stdout-captured artifact

用户场景：用户使用真实 Claude Code host worker 执行 subagent。

步骤：

```text
sdd background run HOST1 --branch feature --worker claude-code-subagent-worker --timeout-seconds 120 --json
sdd background inspect <run_id> --json
sdd status --branch feature --json
```

期望结果：

- worker spawn 真实 host invocation。
- parent runtime 捕获 stdout 中的 `sdd-result`。
- artifact 被写入 expected artifact path。
- background executor ingest artifact。
- SubagentDispatch 和 SubagentResult 状态更新。

覆盖目标：Phase 8.6、Phase 8.10。

#### F2. Host timeout produces blocked/failed result

用户场景：真实 host invocation 超时。

步骤：

```text
sdd background run HOST1 --branch feature --worker claude-code-subagent-worker --timeout-seconds 1 --json
sdd background inspect <run_id> --json
sdd doctor --latest-only --branch feature
```

期望结果：

- hostInvocation 记录 timeout。
- delegation/subagent result 不被误判 PASS。
- blocking 情况下 doctor/ship 阻断。

覆盖目标：Phase 8.6、Phase 8.9、Phase 8.10。

### Round G: `/sdd:test` unified validation

#### G1. Commands pass but acceptance mapping missing blocks policy PASS

用户场景：测试命令成功，但任务没有 `=> AC-*` 映射。

步骤：

```text
sdd test task <task_id> --branch master --command "npm run typecheck"
```

期望结果：

- commandStatus=PASS。
- evidenceCoverage=missing。
- policyJudgment=BLOCKED。
- syncBackReady=false。

覆盖目标：Phase 8.7、Phase 8.8。

#### G2. Commands and acceptance evidence complete produce PASS

用户场景：任务 validation commands 显式映射 acceptance refs。

步骤：

```text
sdd test task PHASE6.10-1 --branch master
```

期望结果：

- commandStatus=PASS。
- evidenceCoverage=complete。
- policyJudgment=PASS。
- validation artifact 记录 command refs、artifact refs、policy refs。
- syncBackReady=true，前提是 orchestration gate PASS。

覆盖目标：Phase 8.7、Phase 8.8。

#### G3. Test command failure blocks sync-back

用户场景：validation command 失败。

步骤：

```text
sdd test task <task_id> --branch master --command "npm test -- --test-name-pattern failing"
sdd sync-back inspect <run_id> --branch master
```

期望结果：

- commandStatus=FAIL。
- policyJudgment=FAIL。
- syncBackReady=false。
- sync-back inspect 不 ready。

覆盖目标：Phase 8.7、Phase 8.8。

#### G4. Orchestration gate BLOCKED prevents test policy PASS

用户场景：commands pass，但 risk/handoff/context/subagent gate blocked。

步骤：

```text
sdd test task <blocked_gate_task> --branch master
sdd sync-back inspect <run_id> --branch master
```

期望结果：

- command evidence 仍被记录。
- policyJudgment 不允许 PASS。
- syncBackReady=false。

覆盖目标：Phase 8.7、Phase 8.8、Phase 8.10。

### Round H: Sync-back

#### H1. Fresh PASS test run is sync-back ready

用户场景：用户完成测试后检查 sync-back。

步骤：

```text
sdd sync-back inspect <pass_run_id> --branch master
```

期望结果：

- ready=true。
- reasons 为空。
- proposal、validation artifact、test index 都可追溯。

覆盖目标：Phase 8.8。

#### H2. Stale/conflicting runs block sync-back

用户场景：存在旧 run 或 affected file conflict。

步骤：

```text
sdd sync-back inspect <run_id> --branch master
```

期望结果：

- ready=false。
- 输出 conflict/stale reason。
- 需要 archive superseded run 或重新验证。

覆盖目标：Phase 8.8、Phase 8.9。

#### H3. Approved apply refreshes verify state

用户场景：复杂或高风险任务通过人工确认后 apply。

步骤：

```text
sdd sync-back apply <run_id> --branch master --approved --refresh-verify
sdd verifies inspect --branch master
```

期望结果：

- sync-back apply 成功。
- tasks/spec/plan 写回符合 proposal。
- verify refreshed 后不 stale。

覆盖目标：Phase 8.8、Phase 8.10。

### Round I: Ship gate

#### I1. Healthy workflow passes ship dry-run

用户场景：用户发布前检查当前分支。

步骤：

```text
sdd doctor --latest-only --branch master
sdd ship --dry-run --branch master
```

期望结果：

- doctor PASS。
- ship dry-run PASS。
- checks 覆盖 documents、workflow gaps、doctor fast、latest run、evidence health、token/context health、risk、handoff、context offload、subagents。

覆盖目标：Phase 8.9、Phase 8.10。

#### I2. Missing lifecycle projection is visible and recoverable

用户场景：旧项目缺少 Phase 8 projection。

步骤：

```text
sdd doctor --latest-only --branch master
sdd status --branch master --json
```

期望结果：

- doctor/status 显示 missing/stale projection。
- 不崩溃。
- 在运行 route/execution/test 后 projection 可补齐。

覆盖目标：Phase 8.1、Phase 8.2、Phase 8.9。

#### I3. Token/context load shedding is not false hard blocker

用户场景：brief context package 出现 deferred/trimmed refs。

步骤：

```text
sdd context build --task <task_id> --branch master --mode doctor --profile brief
sdd statusline --branch master --json
sdd ship --dry-run --branch master
```

期望结果：

- brief profile 的 trim/defer 被视为 load shedding。
- 不单独造成 token/context hard blocker。
- 真正 pressure/overloaded 仍会被报告。

覆盖目标：Phase 8.5、Phase 8.9。

#### I4. Blocking subagent/context/risk prevents ship

用户场景：存在任一 enforced orchestration blocker。

步骤：

```text
sdd ship --dry-run --branch master
```

期望结果：

- ship BLOCKED。
- blocker 明确指出 risk、handoff、context 或 subagent 来源。

覆盖目标：Phase 8.2、Phase 8.5、Phase 8.6、Phase 8.9。

### Round J: CLI surface simplicity

#### J1. No new lifecycle commands are exposed

用户场景：用户查看 CLI help。

步骤：

```text
sdd --help
sdd help workflow
```

期望结果：

- 不出现 `sdd stage handoff`。
- 不出现 `sdd subagent dispatch`。
- 不出现 `sdd context offload`。
- 用户仍通过 `do task`、`background run`、`test task`、`sync-back`、`status`、`doctor`、`ship` 完成 workflow。

覆盖目标：Phase 8.10。

#### J2. Approval channel is discoverable

用户场景：manual-risk task 被阻断后，用户查看帮助。

步骤：

```text
sdd do task --help
sdd background run --help
```

期望结果：

- help 中出现 `--approved`。
- usage 能说明 approved 是人工确认后的执行通道。

覆盖目标：Phase 8.2、Phase 8.10。

### Round K: Regression suite

#### K1. Focused runtime regression

步骤：

```text
node --test --import tsx packages/core/src/orchestration/runtime.test.ts
node --test --import tsx packages/core/src/execution/background-executor.test.ts
node --test --import tsx packages/core/src/verification/test-runtime.test.ts packages/core/src/sync-back/sync-back.test.ts
node --test --import tsx packages/core/src/status/project-status.test.ts packages/core/src/doctor/doctor.test.ts
node --test --import tsx packages/cli/src/commands/cli-regression.test.ts
```

期望结果：

- focused tests PASS。
- manual approval regression PASS。
- enforced orchestration diagnostics PASS。
- CLI help regression PASS。

覆盖目标：Phase 8.1 到 Phase 8.10。

#### K2. Full regression and SDD smoke

步骤：

```text
npm run build
npm run typecheck
npm test
npm pack --dry-run --json
npm run sdd -- status --branch master
npm run sdd -- statusline --branch master --json
npm run sdd -- tasks list --branch master
npm run sdd -- doctor --latest-only --branch master
npm run sdd -- ship --dry-run --branch master
```

期望结果：

- build/typecheck/full test PASS。
- package dry-run PASS。
- status/statusline/tasks/doctor/ship 输出稳定。
- latest run、evidence health、runtime health、test health 可追溯。

覆盖目标：Phase 8.1 到 Phase 8.10。

## 4. Coverage matrix

| Target effect | Cases |
| --- | --- |
| Contract/projection foundation | A1, A2, B12, E8, I2, K1, K2 |
| Lifecycle risk decision | B1-B12, G4, I4 |
| Manual approval gate | B2, B3, B7, B8, J2 |
| Coding-risk breadth | B5, B6, B7, B8, B9, B10, B11, B12 |
| Stage and handoff runtime | C1, C3, E10, H1, I1, I4 |
| Work unit runtime | C1, C2, E1, E2, E5, E10 |
| Context offload | D1, D2, D3, D4, E6, I3, I4 |
| Subagent runtime | E1-E10, F1, F2 |
| Agent/subagent parallel and non-blocking flow | E1, E5, E6, E7, E8, E9, E10 |
| Real Claude Code host invocation | F1, F2, E7, E9 |
| `/sdd:test` unified validation | G1, G2, G3, G4, B5-B11 |
| Sync-back gate | H1, H2, H3, B6-B10, E6, E10 |
| Status/doctor visibility | D4, E2, E7, E8, E9, I1, I2, I4, K2 |
| Ship dry-run gate | C2, D4, E2, E7, E8, I1, I4 |
| CLI simplicity/no new lifecycle commands | J1 |
| Full regression | K1, K2 |

## 5. Research references for expanded scenarios

扩展场景参考了 change-risk assessment、risk-based testing、change impact analysis、human approval gates、SRE release/canary validation、multi-agent handoff 和 agent failure diagnosis 的通用模式；落地到本项目时不引入新的用户命令，只把这些模式转译为现有 SDD workflow gate。

- Google SRE：Testing for Reliability、Canarying Releases、Configuration Design。
- Human-centered change risk assessment / change risk scoring。
- Risk-based testing 与 change impact analysis。
- Microsoft Agent Framework handoff orchestration。
- Agent failure diagnosis、tool invocation reliability、hierarchical multi-agent workflow automation。

## 6. Latest current-project validation snapshot

当前项目已完成一轮 Phase 8.10 closure 后的真实验证闭环，最新快照：

```text
npm run typecheck
Result: PASS

node --test --import tsx packages/core/src/status/project-status.test.ts
Result: PASS

npm test
Result: PASS, 241 tests

npm run sdd -- doctor --latest-only --branch master
Result: PASS, checks pass=50 warn=0 fail=0

npm run sdd -- ship --dry-run --branch master
Result: PASS
```

最新通过并已 sync-back 的 SDD run：

```text
run_id=20260518-004
task=PHASE6.10-1
phase=test
validation=pass
sync_back=applied
commands:
  - npm run typecheck
  - npm test -- --test-name-pattern "context budget"
```

对应 evidence：

```text
.sdd/runs/master/evidence/artifacts/test-index-PHASE6.10-1.json
.sdd/runs/master/evidence/artifacts/validation-PHASE6.10-1.md
.sdd/runs/master/evidence/artifacts/test-PHASE6.10-1-001.log
.sdd/runs/master/evidence/artifacts/test-PHASE6.10-1-002.log
```

## 7. Remaining validation note

以上 case 是 Phase 8 的扩展覆盖清单；已验证主链路和部分关键回归，后续应按 B5-B12、E5-E10 继续补自动化/e2e case。Phase 9 code graph 不在本文件验证范围内；Phase 8 对 code graph 保持 absent-safe，只验证当前 orchestration workflow 不依赖 Phase 9 才能运行。