# Phase 2.7 安装到入口投影 E2E 验收

## 1. 定位

Phase 2.7 对 Phase 2 全链路做 E2E 验收：从本机安装 `sdd`，到目标仓库 `sdd init`，再到 Claude Code `/sdd` 入口可触发、`sdd update` 可刷新、`sdd doctor` 可诊断、最后可 uninstall/cleanup。

## 2. 依赖

```yaml
depends_on:
  - phase-2.1-global-cli-install
  - phase-2.2-ai-tool-adapter-registry
  - phase-2.3-init-update-generated-entries
  - phase-2.4-instruction-api-thin-entries
  - phase-2.5-detector-registry
  - phase-2.6-doctor-drift-check
blocks:
  - phase-3-platform-extension
  - phase-4-code-knowledge-graph
```

## 3. 范围

- 使用 dist CLI、npm link 或 packed tarball 做安装验证。
- 在临时目标仓库运行 `sdd init`。
- 在真实目标仓库 `D:\project\inshn-etalk-web` 做受控 smoke。
- 检查 `.sdd/project.yml`、`.sdd/runs/`、`.claude/skills/sdd/SKILL.md`、`.claude/commands/sdd*.md`。
- 通过读取 generated command/skill 和执行 `sdd instructions overview --json` 模拟 Claude `/sdd` trigger。
- 验证 `sdd update --check`、`sdd update`、`sdd doctor`。
- 验证 uninstall/cleanup。

## 4. 非目标

- 不要求自动控制 Claude Code UI。
- 不执行业务代码修改。
- 不引入 background write/worktree/concurrency。
- 不发布公网 npm 包。

## 5. 交付物

- E2E 验证脚本或手工命令记录。
- 临时目标仓库验证证据。
- `D:\project\inshn-etalk-web` smoke 验证证据。
- install/update/doctor/uninstall 记录。
- `specs/master/phase2.7-{spec,plan,tasks,validation}.md`。

## 6. 验收标准

- 全局或本机安装后的 `sdd --help`、`sdd --version` 可用。
- 目标仓库 `sdd init` 生成正确 `.sdd/project.yml` 和 Claude Code entries。
- generated entries 带 `sdd-ai-entry-v1` metadata，且保持薄入口。
- `sdd instructions overview --json` 可被 generated entry 引用并返回稳定 JSON。
- drift 场景下 `sdd update --check` 和 `sdd doctor` 能发现问题。
- `sdd update` 能修复 missing/drifted managed entries。
- uninstall/cleanup 后不留下全局 CLI 残留。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-2.7-entry-projection-e2e.md
required_by:
  - phase-3-platform-extension
  - phase-4-code-knowledge-graph
```
