# Phase 2.0 AI 工具入口投影与全局安装接入

## 1. 定位

Phase 2.0 在 Phase 1 SDD 闭环完成后，产品化一类通用 AI 工作流入口模式：全局 CLI 安装、目标仓库 `sdd init`、AI 工具原生 skills/commands 投影、`sdd update` 刷新、`sdd doctor` 漂移检查，以及 CLI/core 提供的动态 instruction API。

该模式来自 Spec Kit、GSD、OpenSpec、Oh My OpenCode/OpenAgent 等项目的共同机制：CLI/core 保存 workflow brain，项目初始化只把薄入口投影到具体 AI 工具。

## 2. 依赖

```yaml
depends_on:
  - phase-1.10-real-project-trial
blocks:
  - phase-3-platform-extension
  - phase-4-code-knowledge-graph
```

## 3. 范围

- 全局或本机可复用安装形态：`sdd` 能在任意目标仓库运行。
- `sdd init` 生成 `.sdd/project.yml`、运行目录和 Claude Code 入口。
- AI tool adapter registry：Claude Code 优先，预留 OpenCode/Cursor 等工具。
- 生成 `.claude/skills/sdd-*/SKILL.md`、`.claude/commands/sdd/*.md` 等工具原生入口。
- `sdd update` 刷新 generated entries，并维护 `generatedBy` / version 元数据。
- `sdd doctor` 检查 generated entries 缺失、版本漂移、配置过期。
- instruction API：`sdd instructions <action> --json` 等结构化输出，为薄入口提供当前状态和下一步指令。
- detector registry：把 Phase 1 暂时的 evidence scoring 演进为可扩展项目识别能力，支持 mixed stack、confidence 和 validation command recommendation。

## 4. 非目标

- 不实现 background write agents。
- 不实现 per-task worktree。
- 不实现 dependency wave 并发执行。
- 不实现 plugin loader。
- 不实现 dashboard / run database。
- 不实现代码知识图谱。
- 不把完整 workflow brain 塞进 generated `SKILL.md` 或 command markdown。

## 5. 交付物

- 全局安装 / 本机安装验证方案。
- AI tool adapter registry 设计与 Claude Code adapter。
- generated skill/command 模板与版本元数据规则。
- `sdd init/update/doctor` 对 generated entries 的闭环。
- instruction API contract。
- detector registry contract。
- install -> target repo init -> Claude Code `/sdd` trigger -> update -> doctor -> uninstall E2E 验证。

## 6. 验收标准

- 全局安装后，在目标仓库运行 `sdd init` 能生成正确 `.sdd/project.yml` 和 Claude Code 入口。
- 进入 Claude Code 后，可以通过 `/sdd` 或 `/sdd-*` 触发平台。
- 生成入口带版本元数据，`sdd update` 能刷新，`sdd doctor` 能发现漂移。
- skills/commands 保持薄入口，复杂状态、artifact graph 和下一步指令来自 CLI/core。
- 项目识别基于 detector registry + evidence/confidence/mixed stack，而不是按文件顺序硬编码。
- E2E 覆盖安装、初始化、触发、更新、诊断和卸载。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-2.0-ai-tool-entry-projection.md
required_by:
  - phase-3-platform-extension
  - phase-4-code-knowledge-graph
```
