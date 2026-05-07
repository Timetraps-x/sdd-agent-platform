# Phase 1.4 Validation — Commands / Agents / Workflows Pack

## Validation scope

本阶段为静态 Markdown/YAML asset work。未修改 TypeScript 源码、依赖、构建脚本或运行时接口实现，因此按验证策略不运行 npm scripts。

## Evidence

### 1. Command assets

已静态检查以下文件存在并包含 metadata：

- `commands/sdd-spec.md`
- `commands/sdd-plan.md`
- `commands/sdd-tasks.md`
- `commands/sdd-do.md`
- `commands/sdd-verify.md`
- `commands/sdd-doctor.md`

检查项：

- `contract: sdd-command-v1`
- `version: 0.1.0`
- `phase: 1.4`
- lifecycle gate placeholder 指向 Phase 1.7。
- 输入、输出、禁止事项、成功标准完整。

### 2. Agent assets

已静态检查以下文件存在并包含 metadata：

- `agents/scout.md`
- `agents/spec-reviewer.md`
- `agents/planner.md`
- `agents/implementer.md`
- `agents/reviewer.md`
- `agents/debugger.md`
- `agents/validator.md`

检查项：

- `contract: sdd-agent-v1`
- `version: 0.1.0`
- `phase: 1.4`
- `result_contract: sdd-result-v1`
- 角色边界、输入、允许/禁止事项、输出格式、成功标准完整。

### 3. Workflow assets

已静态检查以下文件存在并包含 metadata：

- `workflows/spec.yml`
- `workflows/plan.yml`
- `workflows/tasks.yml`
- `workflows/do.yml`
- `workflows/verify.yml`
- `workflows/doctor.yml`

检查项：

- `contract: sdd-workflow-v1`
- `version: 0.1.0`
- `phase: 1.4`
- `lifecycle_gate.execution_phase: "1.7"`
- 输入 artifact、输出 artifact、phase gate、禁止自动跨越事项、allowed_agents、doctor_checks 已声明。

### 4. Boundary review

确认未实现以下下游内容：

- Phase 1.5 parser / task model reader。
- Phase 1.6 artifact/delegation runtime。
- Phase 1.7 Claude Code command integration / lifecycle gate execution。
- Phase 1.8 single task loop。
- Phase 1.9 doctor hardening / goal-level runtime verifier。
- plugin loader、tool registry、background write、worktree isolation、自动 commit/push/merge。

### 5. Marker verification command

执行静态 marker 检查：

```text
python marker check: checked=19 failed=0
```

覆盖 6 个 command、7 个 agent、6 个 workflow。

## Result

PASS。

Phase 1.4 静态资产满足 `specs/master/phases/phase-1.4-commands-agents-workflows.md` 的验收标准，可进入 Phase 1.5 parser / task model。
