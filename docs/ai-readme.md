# SDD Agent Platform AI README

这份文档面向 Claude Code 或其他 AI 操作者。人类用户的安装和使用流程见 [用户指南](user-guide.md)。

AI 操作者的目标不是替用户跑最大生命周期，而是根据当前仓库状态选择最短安全下一步，并把运行事实写入 `.sdd/runs` 证据链。

## 1. 总原则

1. 先读状态，不凭聊天上下文猜状态。
2. 一次只推进一个明确 task，除非用户明确要求 wave/background/worktree。
3. 修改必须落在 task Boundary 和 affected_files 内。
4. Evidence 不足时不能硬标 PASS。
5. 不自动 commit、push、创建 PR、改外部系统或执行 destructive 操作。
6. `sync-back apply` 必须先经过 `sync-back inspect`，并遵守 `apply_policy`。
7. 当前 Git branch 与目标 SDD partition 不一致时，显式使用 `--branch <branch>`。
8. 既有未提交改动不是 SDD workflow 的阻塞条件；不要用 clean/reset 作为捷径。

## 2. 固定入口

每次开始先运行：

```bash
sdd status
sdd instructions overview --json
```

如果用户或任务明确指定 partition，使用：

```bash
sdd status --branch <branch>
```

只跟随 CLI/core 返回的 recommended next command。不要从生成的 `.claude/commands/*.md` 推断动态状态；生成文件只是薄入口。

## 3. Claude Code 执行周期

常规周期：

```text
用户意图 -> sdd status -> recommended next command -> 必要时补 spec/plan/tasks -> 选择一个 task -> 实现/证据 -> do/verify -> sync-back inspect -> 按 apply_policy 写回或等待确认
```

大任务生命周期是治理模型，不是每次都要完整跑：

```text
spec -> plan -> tasks(multiple waves) -> graph inspect -> wave inspect -> task-by-task do/verify -> sync-back
```

小任务应该走 direct/compact 的最短安全路径。

## 4. `/sdd` 行为

`/sdd` 是总入口。

应做：

1. 运行 `sdd status`。
2. 报告 documents、task counts、latest run、gaps、recommended next command。
3. 如果指向 task，运行 `sdd tasks inspect <task_id>`。
4. 如果指向 verify 或 sync-back，使用 status/recommended command 里的 branch/task。
5. 如果指向 sync-back，运行 `sdd sync-back inspect --task <task_id>`，必要时加 `--branch <branch>` 或 run id，并报告 `apply_policy`。

不应做：

- 不跳过 status。
- 不静默 apply complex sync-back。
- 不自动创建 parallel spec/plan/tasks。
- 不把历史 run PASS 当作当前 task 已完成，除非 sync-back 已 applied 且当前 docs 未漂移。

## 5. `/sdd:spec`、`/sdd:plan`、`/sdd:tasks`

### `/sdd:spec`

用于创建或细化轻量需求契约。聚焦：

- objective / customer value
- users / actors
- user stories / scenarios
- in scope / out of scope
- functional / non-functional requirements
- acceptance criteria with stable IDs, such as `AC-1`
- assumptions / dependencies
- risks / hard gates
- lifecycle decision reference

不要直接实现代码，也不要在 `spec.md` 里写技术方案。

### `/sdd:plan`

用于从 spec 推导交付级技术方案文档。聚焦：

- current state / target design
- architecture / component impact
- PlantUML sequence、state、component 等图
- state / data / API / concurrency design
- key decisions and alternatives
- risk control
- rollout / rollback
- validation matrix
- task breakdown rationale

不要绕过未解决的 spec gap；高风险场景不要只写 approach 摘要。

### `/sdd:tasks`

用于从 approved spec/plan 创建执行证据契约。

必须先运行：

```bash
sdd tasks format
```

规则：

- `sdd-task` fenced block 里只放 metadata。
- 每个任务尽量映射 `acceptance_refs` 和 `plan_refs`。
- 高风险任务要显式写 `allowed_agents`、`required_artifacts`、`verification_availability`、`autonomy`。
- `#### Boundary`、`#### Acceptance`、`#### Definition of Done`、`#### Evidence Expectations`、`#### Implementation Notes` 放在 fenced block 外。
- 写完后运行 `sdd tasks list`、`sdd tasks inspect` 和 `sdd tasks gaps`。

不要把 `tasks.md` 写成普通 TODO 或项目管理 backlog。

## 6. `/sdd:do`

用于执行一个已经明确、无 blocking gaps 的 task。

推荐流程：

```bash
sdd status --branch <branch>
sdd instructions do --json
sdd tasks inspect <task_id> --branch <branch>
sdd tasks route <task_id> --branch <branch>
sdd run create

sdd artifact template artifacts/implement-<task_id>.md --task <task_id> --agent implementer --branch <branch> --run <run_id> --write
sdd artifact template artifacts/review-<task_id>.md --task <task_id> --agent reviewer --branch <branch> --run <run_id> --write
sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator --branch <branch> --run <run_id> --write

sdd artifact validate <run_id> artifacts/implement-<task_id>.md --task <task_id> --agent implementer
sdd artifact validate <run_id> artifacts/review-<task_id>.md --task <task_id> --agent reviewer
sdd artifact validate <run_id> artifacts/validation-<task_id>.md --task <task_id> --agent validator

sdd do task <task_id> --branch <branch> --run <run_id> \
  --implement-artifact artifacts/implement-<task_id>.md \
  --review-artifact artifacts/review-<task_id>.md \
  --validation-artifact artifacts/validation-<task_id>.md
```

要求：

- 只执行选中的 task boundary。
- source/test/doc 文件引用写入 `## Evidence`，不要放进 `sdd-result.artifacts`。
- `sdd-result.artifacts` 只放 run-relative `artifacts/...` 路径。
- artifact validate 全部通过后再进入 `do`。
- `do` 后检查 artifact ingestion evidence。

禁止：

- 自动扩大 task scope。
- 自动 commit / push。
- evidence 不足时标 PASS。
- 直接运行 background executor 替代用户主路径，除非用户明确要求。

## 7. `/sdd:verify`

用于 goal-level acceptance coverage verify。

推荐流程：

```bash
sdd status --branch <branch>
sdd instructions verify --json
sdd artifact validate <run_id> artifacts/validation-<task_id>.md --task <task_id> --agent validator
sdd verify task <task_id> --branch <branch> --run <run_id>
sdd sync-back inspect <run_id> --branch <branch> --task <task_id>
```

validator artifact 必须包含 task Acceptance 原文。推荐始终用模板生成：

```bash
sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator --branch <branch> --run <run_id> --write
```

不要把 Acceptance 改写成同义句，否则 deterministic verify 可能 block。

## 8. sync-back apply 策略

`sync-back apply` 会修改 `specs/<branch>/tasks.md`，必须先 inspect：

```bash
sdd sync-back inspect <run_id> --branch <branch> --task <task_id>
```

如果输出：

```text
apply_policy=direct approval_required=false
```

说明是简单/direct-safe 任务，可以执行：

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

## 9. doctor / archive / update

正常健康检查：

```bash
sdd doctor
```

只检查当前最新 run：

```bash
sdd doctor --latest-only
```

检查 generated entries：

```bash
sdd update --check
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