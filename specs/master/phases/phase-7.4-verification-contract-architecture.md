# Phase 7.4 Verification Contract Architecture

## 1. 定位

Phase 7.4 在 Runtime Storage v2 和 Workflow State Resolver 稳定后，引入 verification contract。目标是新增 `/sdd:verifies` 和 `specs/<branch>/verify.md`，让验证标准先于测试执行被定义。

本阶段先调研真实项目验证样本、现有 verify 语义，以及 Spec Kit、OpenSpec、cc-sdd、AgentPlane、GSD 等 GitHub/open-source 项目的 verification / acceptance / review contract，再走 0.3.0 SDD 链路。

## 2. 依赖

- depends_on: Phase 7.3 Workflow State Resolver and Performance Read Path
- blocks: Phase 7.5 Test Runtime and Evidence Execution
- required_by: Phase 7.5 Test Runtime and Evidence Execution

## 3. 范围

- 新增 `/sdd:verifies` 命令方向。
- 新增正式 workflow artifact：`specs/<branch>/verify.md`。
- 定义 task-level、group-level、release-level verification mapping。
- 定义 V0-V4 verification levels。
- 定义 PASS、PASS_WITH_GAPS、FAIL、BLOCKED 判定标准。
- 将 `verify.md` 纳入 stale/status/doctor 可见性。

## 4. 非目标

- 不执行测试。
- 不采集 evidence。
- 不让 `compile/typecheck pass` 等同 semantic verify pass。
- 不要求每个 task 都独立跑真实 case。

## 5. 交付物

- `verify.md` contract/template。
- `/sdd:verifies` command and generated entry design。
- Verification contract parser / status visibility。
- V0-V4 verification level documentation。

## 6. 验收标准

- `/sdd:verifies` 能生成或更新 `specs/<branch>/verify.md`。
- `verify.md` 能关联 spec/plan/tasks/task groups。
- status/doctor 能识别 verify contract 是否存在、是否过期、是否有 gaps。
- 旧 verify 命令在本阶段不被破坏。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-7.4-verification-contract-architecture.md`
- Verification contract and `verify.md` template
