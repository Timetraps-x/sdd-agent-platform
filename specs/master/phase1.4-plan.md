# Phase 1.4 Plan — Commands / Agents / Workflows Pack

## 1. 实施策略

以静态资产包为交付边界，按三类资产分别落地：

1. commands：定义 Claude Code 命令入口 contract，但仅保留 lifecycle decision gate placeholder。
2. agents：定义七角色短 prompt contract，保证 artifact-first 和角色边界。
3. workflows：定义阶段 workflow YAML contract，声明 gate、artifact、checkpoint、doctor checks。

## 2. 资产设计

### Command asset

统一 frontmatter：

```yaml
---
name: sdd-*
version: 0.1.0
phase: 1.4
contract: sdd-command-v1
workflow: workflows/*.yml
lifecycle_gate: placeholder-only-phase-1.7
---
```

Command 正文只描述交互入口和 contract，不复制 runtime 状态机。

### Agent asset

统一 frontmatter：

```yaml
---
name: <agent>
version: 0.1.0
phase: 1.4
contract: sdd-agent-v1
mode: read-only | foreground-write | read-only-plus-validation-command
result_contract: sdd-result-v1
---
```

Agent 输出统一引用 `schemas/contracts/sdd-result-contract.md`。

### Workflow asset

统一字段：

```yaml
contract: sdd-workflow-v1
version: 0.1.0
phase: 1.4
name: <phase>
command: commands/sdd-*.md
lifecycle_gate:
  position: command_entry
  contract: schemas/contracts/lifecycle-decision-contract.md
  execution_phase: "1.7"
inputs:
  artifacts: []
outputs:
  artifacts: []
phase_gates: {}
forbidden_auto_transitions: []
allowed_agents: []
doctor_checks:
  required_assets: []
```

## 3. 边界控制

- lifecycle gate 只声明位置和 contract，占位不执行。
- `/sdd-do` 只描述执行边界，不实现 loop、artifact validation、delegation liveness。
- `/sdd-doctor` 只声明静态/只读诊断，不实现 auto-fix 或 Phase 1.9 hardening。
- Workflows 是可加载 contract，不是 runtime executor。

## 4. 更新计划

- 新增 `commands/` 静态资产。
- 新增 `agents/` 静态资产。
- 新增 `workflows/` 静态资产。
- 更新 `schemas/contracts/doctor-static-assets-contract.md` 的 Phase 1.4 required assets。
- 更新 README 和 top-level spec/plan/tasks/validation indexes。
- 写入 Phase 1.4 validation evidence 后再更新 `PHASE_STATUS.md`。

## 5. 验证计划

本阶段只修改 Markdown/YAML 静态资产，不修改 TypeScript、依赖、构建脚本或接口契约实现；按项目验证策略，不运行 npm scripts。

验证采用静态审查：

- 路径存在性检查。
- contract/version marker 检查。
- Phase 1.4 非目标边界检查。
- 与 Phase 1.3 contracts/templates/adapters 引用检查。
