# Phase 1.9 Goal-level Verify 与 Doctor 加固

## 1. 定位

Phase 1.9 在 single-task loop 完成后，把验证从“命令是否成功”提升为“验收目标是否被证据覆盖”。

本阶段加固 `/sdd-verify` 与 `/sdd-doctor`，让它们能识别 artifact、event、liveness、acceptance coverage 的不一致。

## 2. 依赖

```yaml
depends_on:
  - phase-1.3-contract-templates-adapters
  - phase-1.4-commands-agents-workflows
  - phase-1.5-sdd-parser-task-model
  - phase-1.6-artifact-delegation-contract
  - phase-1.7-claude-code-command-integration
  - phase-1.8-single-task-loop
blocks:
  - phase-1.10-real-project-trial
```

## 3. 范围

- `/sdd-verify` 读取 spec/plan/task acceptance、diff summary、review result 和 validation commands。
- validation artifact 映射 acceptance。
- `/sdd-doctor` 增加 stale delegation、artifact invalid、terminal event 缺失检查。
- 识别 state/events/artifacts 不一致。
- 验证结果进入 sync-back proposal。

## 4. 非目标

- 不做 dashboard。
- 不做 doctor auto-fix。
- 不做 run database。
- 不自动修复 artifact 或 event log。

## 5. 交付物

- goal-level verify 规则。
- acceptance coverage artifact。
- doctor 加固检查项。
- validator 输出 contract。
- verify result 到 sync-back proposal 的映射规则。

## 6. 验收标准

- validator 能输出 PASS / PASS_WITH_GAPS / FAIL / BLOCKED。
- doctor 能识别 state/events/artifacts 不一致。
- stale delegation、artifact invalid、terminal event 缺失能被报告。
- 验证结果能进入 sync-back proposal。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.9-goal-verify-doctor.md
required_by:
  - phase-1.10-real-project-trial
```
