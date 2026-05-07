# Phase 2.6 Doctor Drift Check 与 Update Check 模式 Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.6-doctor-drift-check.md` 的执行 spec。

## 1. 目标

让 `sdd doctor` 检查 generated AI entries 的 missing/drift/foreign/conflict，并与 `sdd update --check` 使用一致语义。

## 2. 范围

- doctor 在 project config 存在时调用 `checkAiToolEntryDrift`。
- 每个 projected entry 转为 doctor check。
- `unchanged` -> PASS。
- `missing`/`drifted` -> FAIL，action `Run sdd update.`。
- `foreign`/`conflict` -> FAIL，action 指向人工 review。
- check-only 不写入文件。

## 3. 非目标

- doctor 不自动修复 drift。
- doctor 不覆盖 foreign files。
- doctor 不做 git reset/cleanup。

## 4. 验收标准

- managed entry clean 时 doctor 对 AI entry 输出 PASS。
- 修改 managed entry body 后 doctor 返回 FAIL。
- `sdd update` 修复后 doctor AI entry 恢复 PASS。
- 真实目标仓库 read-only smoke 能报告 missing entries。
