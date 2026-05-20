# Phase 7.5 Test Runtime and Evidence Execution

## 1. 定位

Phase 7.5 在 `verify.md` contract 稳定后实现 `/sdd:test`。本阶段把测试执行和验证判断分离：`/sdd:test` 负责执行和收集 evidence，`/sdd:verify` 负责判断 evidence 是否覆盖 `verify.md`。

本阶段先调研当前 verify/validation/sync-back 代码、真实项目测试环境协同样本，以及 GitHub/open-source 项目的 test execution、CI evidence、artifact gating、record-only verification 机制，再走 0.3.0 SDD 链路。

## 2. 依赖

- depends_on: Phase 7.4 Verification Contract Architecture
- blocks: Phase 7.8 Sync-back Approval, Ship and Observability
- required_by: Phase 7.8 Sync-back Approval, Ship and Observability

## 3. 范围

- 新增 `/sdd:test` 命令方向。
- 扩展 SQLite test run、test step、verification result、evidence link 状态。
- 将 raw command output / SQL / API / screenshot / failure excerpt 写入 branch evidence，并以 SQLite ref 关联。
- 将 `/sdd:verify` 调整为基于 `verify.md` + test result + evidence refs 的判断。
- 为 sync-back 提供更可靠的 verification decision。

## 4. 非目标

- 不做完整 command-scoped team runtime。
- 不把完整测试日志塞入主上下文。
- 不把测试报告当 workflow doc 放入 `.sdd/runs`。
- 不要求所有 task 都跑 V3/V4 真实 case。

## 5. 交付物

- `/sdd:test` CLI and generated entry。
- Test runtime schema extension。
- Evidence collection and indexing。
- Verify judgment based on `verify.md`。
- Sync-back inspection uses verification decision instead of old validation-only status。

## 6. 验收标准

- `/sdd:test` 可执行 verify item 或 group。
- Test result 写入 SQLite，raw evidence 只作为 evidence attachment。
- `/sdd:verify` 能输出 PASS/PASS_WITH_GAPS/FAIL/BLOCKED。
- sync-back 不再只依赖旧 `validation.status`。

## 7. 可被下游引用的产物

- `specs/master/phases/phase-7.5-test-runtime-evidence-execution.md`
- Test runtime and evidence execution contract
