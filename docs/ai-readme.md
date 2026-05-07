# SDD Agent Platform AI README

这份文档面向 Claude Code 或其他 AI 操作者。人类用户的产品使用流程见 [`docs/user-guide.md`](user-guide.md)。

AI 操作者的目标不是替用户跑完整大生命周期，而是根据当前仓库状态选择最短安全下一步，并把所有运行事实写入 `.sdd/runs` 证据链。

## 1. 总原则

1. 先读状态，不凭上下文猜状态。
2. 一次只推进一个明确 task，除非用户明确要求 wave/background 能力。
3. 代码或文档修改必须落在 task Boundary 内。
4. Evidence 不足时不能硬标 PASS。
5. 不自动 commit、push、创建 PR、改外部系统或执行 destructive 操作。
6. `sync-back apply` 必须先经过 `sync-back inspect`，并遵守 `apply_policy`。

## 2. Claude Code 执行周期

Claude Code 的交互周期通常是：

```text
用户意图 -> sdd status -> 读取 recommended next command -> 必要时补 spec/plan/tasks -> 选择一个 task -> 实现/证据 -> do/verify -> sync-back inspect -> 按 apply_policy 写回或等待确认
```

这不是平台大任务生命周期的逐步复刻。大任务生命周期是治理模型：

```text
spec -> plan -> tasks(multiple waves) -> graph inspect -> wave inspect -> task-by-task do/verify -> sync-back
```

AI 应在该模型内选择当前最短安全动作。

## 3. 固定入口

每次开始先运行：

```bash
sdd status
sdd instructions overview --json
```

然后只跟随 CLI/core 返回的 recommended next command。不要从生成的 `.claude/commands/*.md` 中推断动态状态；生成文件只是薄入口。

## 4. `/sdd` 行为

`/sdd` 是总入口。

应做：

1. 运行 `sdd status`。
2. 报告 documents、task counts、latest run、gaps、recommended next command。
3. 如果指向 task，运行 `sdd tasks inspect <task_id>`。
4. 如果指向 run，运行 `sdd run inspect <run_id>`。
5. 如果指向 sync-back，运行 `sdd sync-back inspect <run_id> --task <task_id>` 并报告 `apply_policy`。

不应做：

- 不跳过 status。
- 不静默 apply complex sync-back。
- 不自动创建 parallel spec/plan/tasks。

## 5. `/sdd:spec`、`/sdd:plan`、`/sdd:tasks`

### `/sdd:spec`

用于创建或细化需求语义事实源。

聚焦：

- requirements
- scope
- non-goals
- acceptance

不要直接实现代码。

### `/sdd:plan`

用于从 spec 推导技术方案。

聚焦：

- approach
- impact
- risks
- validation strategy

不要绕过未解决的 spec gap。

### `/sdd:tasks`

用于从 spec/plan 创建 graph-ready task blocks。

必须先运行：

```bash
sdd tasks format
```

规则：

- `sdd-task` fenced block 里只放 metadata。
- `#### Boundary`、`#### Acceptance`、`#### Implementation Notes` 放在 fenced block 外。
- 写完后运行 `sdd tasks list` 和 `sdd tasks gaps`。

## 6. `/sdd:do`

用于执行一个已经明确、无 blocking gaps 的 task。

推荐流程：

```bash
sdd status
sdd instructions do --json
sdd tasks inspect <task_id>
sdd artifact template artifacts/<agent>-<task_id>.md --task <task_id> --agent <agent>
sdd artifact validate <run_id> <artifact> --task <task_id> --agent <agent>
sdd do task <task_id> --branch <branch> --run <run_id> --review-artifact <path> --validation-artifact <path>
```

要求：

- 只执行选中的 task boundary。
- source/test 文件写入 `## Evidence`，不要放进 `sdd-result.artifacts`。
- `sdd-result.artifacts` 只放 run-relative `artifacts/...` 路径。
- `sdd do task` 应记录 Phase 3 artifact ingestion evidence。

禁止：

- 自动扩大 task scope。
- 自动 commit / push。
- evidence 不足时标 PASS。
- 直接运行 background executor 来替代用户主路径，除非用户明确要求。

## 7. `/sdd:verify`

用于 goal-level acceptance coverage verify。

推荐流程：

```bash
sdd status
sdd run inspect <run_id>
sdd instructions verify --json
sdd artifact validate <run_id> <artifact> --task <task_id> --agent validator
sdd verify task <task_id> --branch <branch> --run <run_id>
sdd sync-back inspect <run_id> --branch <branch> --task <task_id>
```

validator artifact 必须包含 task Acceptance 原文，推荐使用：

```bash
sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator --branch <branch>
```

## 8. sync-back apply 策略

`sync-back apply` 会修改 `specs/<branch>/tasks.md`，必须先 inspect：

```bash
sdd sync-back inspect <run_id> --branch <branch> --task <task_id>
```

如果输出：

```text
apply_policy=direct approval_required=false
```

说明是简单/direct-safe 任务，可以直接执行：

```bash
sdd sync-back apply <run_id> --branch <branch> --task <task_id>
```

如果输出：

```text
apply_policy=confirm approval_required=true
```

说明是复杂或高风险任务。必须先向用户确认，再执行：

```bash
sdd sync-back apply <run_id> --branch <branch> --task <task_id> --approved
```

不要自己把“复杂任务确认”解释成已经获批；必须有用户明确确认。

## 9. doctor / archive

正常健康检查：

```bash
sdd doctor
```

只检查当前最新 run：

```bash
sdd doctor --latest-only
```

历史审计：

```bash
sdd doctor --all-runs
```

失败探索 run 不要删除 evidence，使用：

```bash
sdd run archive <run_id> --reason <text>
```

## 10. 高级能力边界

这些不是普通用户主路径：

- `sdd graph inspect`
- `sdd wave inspect`
- `sdd wave run`
- `sdd background run`
- `sdd worktree create|keep|remove`
- `sdd governance evaluate`

只有在用户明确要求平台能力验证、wave/background/worktree 或治理评估时才使用。

## 11. 输出给用户时应说明什么

每次操作结束，报告：

- 当前 run id。
- task id。
- status / validation / sync-back 状态。
- 生成或消费的 artifact 路径。
- blocking gaps 或需要用户确认的点。
- 下一条推荐命令。

不要把内部推理、长篇 prompt 或无关命令输出当成用户结果。
