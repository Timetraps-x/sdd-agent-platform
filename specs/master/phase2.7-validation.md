# Phase 2.7 安装到入口投影 E2E 验收 Validation

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.7-entry-projection-e2e.md` 的验证记录。

## 1. 验证清单

| Check | Expected | Result | Evidence |
|---|---|---|---|
| Clean validation | typecheck/tests/build pass | pass | `rm -rf dist && npm run typecheck && npm test && npm run build` passed; tests: 35 pass. |
| Pack | tarball generated with runtime files only | pass | `npm pack` generated `sdd-agent-platform-0.1.0.tgz`, total files 15, no compiled test files. |
| Install | isolated global prefix install works | pass | `npm install -g --prefix <tmp> ./sdd-agent-platform-0.1.0.tgz`; `sdd --version` -> `0.1.0`. |
| Init | temp target creates SDD and Claude Code entries | pass | `sdd init --ai claude-code` returned six `created` entries. |
| Trigger simulation | generated entry target API works | pass | `sdd instructions overview --json` returned `sdd-instructions-v1`. |
| Update check clean | clean target has current managed entries | pass | `sdd update --check` passed after init. |
| Drift detection | modified managed command is detected | pass | drifted `.claude/commands/sdd.md` made `sdd update --check` fail with `sdd-root` status `drifted`. |
| Update repair | managed drift is refreshed | pass | `sdd update` followed by `sdd update --check` passed. |
| Doctor | doctor reports AI entries current | pass | temp target doctor showed all `ai_entry_*` checks PASS after repair. |
| Uninstall | isolated prefix binary removed | pass | `npm uninstall -g --prefix <tmp> sdd-agent-platform`; binary absence verified. |
| Real repo smoke | real target read-only commands work | pass | `D:\project\inshn-etalk-web` instructions succeeded; `update --check`/doctor reported missing AI entries without write. |
| Real repo full-chain isolated | real target HEAD clone supports write E2E | pass | cloned `D:\project\inshn-etalk-web` HEAD into `D:\project\.sdd-realcase-e2e\inshn-etalk-web`; installed tarball `sdd --version` -> `0.1.0`; `sdd init --ai claude-code` created six entries; `instructions overview --json` returned `sdd-instructions-v1`; clean `update --check` passed; drifted `.claude/commands/sdd.md` made `update --check` fail with `sdd-root` drifted; `sdd update` refreshed it; repaired `update --check` passed; repaired doctor showed all `ai_entry_*` PASS. |

## 2. 真实目标仓库说明

`D:\project\inshn-etalk-web` 在验证时已有大量未提交改动和未跟踪 `.sdd/.claude` 内容，因此原始工作区只执行只读 smoke：

- `node D:/project/sdd-agent-platform/dist/packages/cli/src/main.js instructions overview --json`
- `node D:/project/sdd-agent-platform/dist/packages/cli/src/main.js update --check`
- `node D:/project/sdd-agent-platform/dist/packages/cli/src/main.js doctor`

未在原始工作区执行写入型 `sdd init` 或 `sdd update`，避免污染用户现场。

随后基于该仓库 HEAD `6d0130c4c058ace10049e96b0b03d7180a7a13fe` 创建隔离克隆 `D:\project\.sdd-realcase-e2e\inshn-etalk-web`，执行真实目标写入型全链路 E2E：

- isolated prefix 安装 `sdd-agent-platform-0.1.0.tgz`，`sdd --version` 输出 `0.1.0`。
- `sdd init --ai claude-code` 创建 `.sdd/project.yml` 与六个 Claude Code managed entries。
- `sdd instructions overview --json` 返回 `sdd-instructions-v1`。
- clean `sdd update --check` 返回 PASS。
- 人工 drift `.claude/commands/sdd.md` 后，`sdd update --check` 返回 FAIL，`sdd-root` 状态为 `drifted`。
- `sdd update` 将 `sdd-root` 刷新为 `updated`，随后 `sdd update --check` 返回 PASS。
- `sdd doctor` 在修复后显示所有 `ai_entry_*` PASS；仅因真实仓库 HEAD 缺少 `specs` 和 runs 产生预期 WARN。

## 3. 验收结论

```yaml
phase: phase-2.7-entry-projection-e2e
status: completed
validation_method: clean-build-pack-install-temp-e2e-real-readonly-smoke-real-head-isolated-write-e2e
completion_evidence:
  - package.json
  - tsconfig.build.json
  - packages/core/src/ai-tools.ts
  - packages/core/src/instructions.ts
  - packages/core/src/index.ts
  - packages/cli/src/main.ts
  - packages/core/src/index.test.ts
  - specs/master/phase2.7-validation.md
next_gate: Phase 3 platform extension may start
open_gaps: []
```
