# Phase 1.5 SDD 文档读取与 Task 模型

## 1. 定位

Phase 1.5 在 Phase 1.2 runtime skeleton 和 Phase 1.3 static contracts 完成后，让 runtime 能理解 Markdown 语义事实源，尤其是 `tasks.md` 中的 task metadata。

本阶段只做读取、解析和 gap 报告，不自动改写 SDD 文档，不执行 task。

## 2. 依赖

```yaml
depends_on:
  - phase-1.2-runtime-skeleton
  - phase-1.3-contract-templates-adapters
blocks:
  - phase-1.7-claude-code-command-integration
  - phase-1.8-single-task-loop
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```

## 3. 范围

- 解析 `specs/<branch>/spec.md / plan.md / tasks.md` 的存在性和基本结构。
- 解析 `sdd-task` fenced block。
- 提取 `id / status / wave / depends_on / affected_files / validation / risk`。
- 提供 task list / task inspect。
- 检测 task metadata 缺失并产出 Task Gap 报告。

## 4. 非目标

- 不要求完整 Markdown AST。
- 不自动改写 `tasks.md`。
- 不做 dependency wave 并发调度。
- 不执行 task。
- 不生成 sync-back proposal。

## 5. 交付物

- task parser runtime 能力。
- task model 类型定义。
- Task Gap 报告格式。
- task list / inspect CLI 能力或 runtime API。

## 6. 验收标准

- 能列出当前 branch 下所有 task。
- 能检查单个 task 的边界、依赖、验证命令和受影响文件。
- metadata 不足时输出明确 gap，而不是继续执行。
- 不改写 `spec.md / plan.md / tasks.md`。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-1.5-sdd-parser-task-model.md
required_by:
  - phase-1.7-claude-code-command-integration
  - phase-1.8-single-task-loop
  - phase-1.9-goal-verify-doctor
  - phase-1.10-real-project-trial
```
