# Phase 3.14 Plan

## Approach

1. 增加 `GOVERNANCE_POLICY_CONTRACT_VERSION` 和 governance policy 类型：
   - `GovernancePolicyOperation`
   - `GovernancePolicyDecisionStatus`
   - `GovernancePolicy`
   - `GovernancePolicyDecisionInput`
   - `GovernancePolicyDecision`
2. 定义内置 governance policy：
   - background delegation 最大并发数。
   - wave executor 最大并发数。
   - sync-back apply、destructive git、external interaction、cleanup 默认需要显式确认。
   - manual handoff worker 和高风险 tags 需要显式确认。
   - cleanup 只 archive，不删除 run history。
   - terminal delegation 不允许 retry reopen。
   - 固化 stop conditions 和 audit evidence。
3. 增加 core API：
   - `inspectGovernancePolicy(projectRoot)`。
   - `evaluateGovernancePolicy(projectRoot, input)`。
4. 接入 executor gate：
   - `runBackgroundExecutor` 在 claim/执行前评估 policy。
   - `runWaveExecutor` 在运行前评估 policy。
   - 被阻塞时写入 `governance_policy_blocked` event 并返回 blocked 结果。
5. 接入 doctor：
   - 增加 `governance_policy_contract` check。
   - 检查内置 policy 的安全边界可见且未破坏。
6. 接入 capability registry：
   - 新增 `governance-policy` capability。
   - 声明允许用途、证据要求和禁止用途。
7. CLI 增加：
   - `sdd governance inspect [--json]`
   - `sdd governance evaluate <operation> [--worker <adapter_id>] [--risk <tag>] [--approved] [--json]`
8. Tests 覆盖：
   - confirmation gate。
   - concurrency gate。
   - executor blocked event。
   - doctor visibility。
   - CLI inspect/evaluate。
9. 更新 retained docs/index/status 并执行 typecheck/test/build/doctor/CLI smoke。

## Safety

- Governance policy 只解释和阻塞运行时 gate，不绕过 Claude Code permission prompt。
- 不自动批准 destructive/shared-state 操作。
- 不删除 `.sdd/runs` 历史，cleanup 仅 archive-only。
- 不引入远端服务、cloud queue 或 dashboard。
- 不自动执行 sync-back apply、commit 或 push。
