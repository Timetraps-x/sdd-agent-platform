# Phase 2.0 AI 工具入口投影执行基线 Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.0-ai-tool-entry-projection.md` 的执行 spec。

Phase 2.0 不直接实现代码，而是把 Phase 2 拆成可逐步执行、可验证、可回退的小阶段，冻结安装形态、init 生成产物、generated entry contract、update/doctor/instructions/detector/E2E 的边界。

## 1. 背景

Phase 1 已完成 SDD 闭环、runtime、doctor、task loop 和真实项目试跑。Phase 2 的任务不是重写 workflow brain，而是把现有 CLI/core 能力产品化为可全局安装、可在目标仓库 `sdd init`、可投影为 Claude Code 原生 `/sdd` 入口的薄入口层。

当前缺口：

- root package 已有 `bin.sdd`，但未完成全局安装和 tarball 安装验证。
- `sdd init` 只生成 `.sdd/project.yml` 和 `.sdd/runs`，不生成 Claude Code entries。
- 没有 AI tool adapter registry。
- 没有 `sdd update`。
- `sdd doctor` 不检查 generated entries 漂移。
- 没有 `sdd instructions <action> --json`。
- detector 仍是内联 evidence scoring，还不是 registry contract。

## 2. 目标

Phase 2.0 完成后，Phase 2 应被拆分为一组可顺序推进的小阶段，每个小阶段有明确 artifact、依赖、范围、非目标、交付物和验收标准。

## 3. 范围

### 3.1 包含

- 固化 Phase 2 的安装策略：本地 link、pack tarball、本机全局安装、未来 npm 发布边界。
- 固化 `sdd init` 在目标仓库生成的产物清单。
- 固化 Claude Code generated entry 路径、frontmatter、version/hash metadata 和 drift 规则。
- 固化 `sdd update`、`sdd doctor`、`sdd instructions` 的 contract 边界。
- 固化 detector registry 的 evidence/confidence/mixed-stack 输出要求。
- 将 Phase 2 拆成 2.1~2.7 小阶段。
- 创建 Phase 2.0 retained docs：spec、plan、tasks、validation。
- 更新 phase index、status 和顶层 spec/plan/tasks/validation 索引。

### 3.2 不包含

- 不实现 TypeScript 代码。
- 不修改 CLI 行为。
- 不生成真实 `.claude` entry。
- 不执行 npm link、npm pack 或目标仓库 E2E。
- 不引入 Phase 3 的 plugin loader、worktree/concurrency、dashboard/run DB。
- 不引入 Phase 4 npm distribution、Phase 5 harness engineering、Phase 6 agent/skill runtime harness 或 Phase 7 代码知识图谱。

## 4. 功能需求

### FR-1 Phase 2 小阶段拆分

必须拆分出以下小阶段：

- Phase 2.1：全局 CLI 安装与 package/bin 硬化。
- Phase 2.2：AI tool adapter registry 与 Claude Code adapter contract。
- Phase 2.3：`sdd init/update` generated entries 生成与刷新。
- Phase 2.4：instruction API 与薄入口 command/skill。
- Phase 2.5：detector registry 与 mixed-stack/confidence 输出。
- Phase 2.6：doctor drift check 与 update check 模式。
- Phase 2.7：install -> target repo init -> Claude `/sdd` trigger -> update -> doctor -> uninstall E2E。

### FR-2 安装形态

必须明确 Phase 2 优先验证顺序：

1. `npm run build` 后直接执行 dist CLI。
2. `npm link` 本地开发安装。
3. `npm pack` 后 `npm install -g ./sdd-agent-platform-<version>.tgz`。
4. 未来 npm 发布只作为延后选项，不作为 Phase 2.0 必须发布项。

### FR-3 Init 产物 contract

必须明确目标仓库最小产物：

```text
.sdd/project.yml
.sdd/runs/
.claude/skills/sdd/SKILL.md
.claude/commands/sdd.md
.claude/commands/sdd/spec.md
.claude/commands/sdd/doctor.md
.claude/commands/sdd/update.md
.claude/commands/sdd/instructions.md
```
注：早期 Phase 2.0 曾包含独立 init 子入口；当前形态已改为 `/sdd` 根入口 + `/sdd:spec` workflow partition 入口，`sdd init` 保持项目级 CLI。

### FR-4 Generated entry metadata

必须明确每个 managed entry 使用 `sdd-ai-entry-v1`，包含 `sdd_managed`、`sdd_version`、`sdd_tool`、`sdd_artifact_kind`、`sdd_artifact_id`、`sdd_source`、`sdd_hash`。

### FR-5 Thin entry 原则

generated `SKILL.md` 和 command markdown 只能作为薄入口，真实状态、artifact graph 和下一步指令必须来自 CLI/core，尤其是 `sdd instructions <action> --json`。

## 5. 验收标准

- `specs/master/phases/` 下存在 Phase 2.1~2.7 artifact。
- `specs/master/phase2.0-spec.md`、`phase2.0-plan.md`、`phase2.0-tasks.md`、`phase2.0-validation.md` 已创建。
- `specs/master/phases/README.md` 与 `PHASE_STATUS.md` 已纳入 Phase 2.0~2.7。
- 顶层 `spec.md`、`plan.md`、`tasks.md`、`validation.md` 已索引 Phase 2.0 retained docs。
- Phase 2.0 validation 记录文档审查证据。
- Phase 2.1 可在 Phase 2.0 完成后开始。

## 6. 风险与边界

- 最大风险是 Phase 2.0 直接进入实现，导致安装/entry/update/doctor contract 未冻结；本阶段只做拆分和基线文档。
- 第二风险是 generated entry 变成大 prompt；本阶段明确薄入口和 instruction API 原则。
- 第三风险是覆盖用户手写 Claude 文件；本阶段明确 managed metadata 和 foreign conflict 规则。
