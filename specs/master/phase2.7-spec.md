# Phase 2.7 安装到入口投影 E2E 验收 Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.7-entry-projection-e2e.md` 的执行 spec。

## 1. 目标

验证 Phase 2 全链路：build -> pack -> tarball install -> temp target init -> instructions trigger simulation -> update check -> drift repair -> doctor -> uninstall，以及真实目标仓库 read-only smoke。

## 2. 范围

- clean runtime build。
- tarball pack and isolated global prefix install。
- temp git target repo `sdd init --ai claude-code`。
- `sdd instructions overview --json` 模拟 Claude `/sdd` trigger。
- `sdd update --check` clean/drift/fixed 三种状态。
- `sdd update` 修复 managed drift。
- `sdd doctor` 验证 AI entries current。
- uninstall/cleanup binary 检查。
- `D:\project\inshn-etalk-web` read-only smoke。

## 3. 非目标

- 不自动控制 Claude Code UI。
- 不修改真实目标仓库业务代码。
- 真实目标仓库存在大量既有改动时，不运行写入型 `sdd init/update`。
- 不发布公网 npm 包。

## 4. 验收标准

- `sdd --version` 在 tarball install 后可用。
- temp target init 创建六个 Claude Code managed entries。
- instructions JSON 返回 `sdd-instructions-v1`。
- drift 后 `update --check` 返回 FAIL/drifted。
- update 修复后 `update --check` 通过。
- doctor 显示 AI entries PASS。
- uninstall 后 binary 不残留。
- 真实目标仓库 read-only smoke 能运行 instructions/update-check/doctor。
