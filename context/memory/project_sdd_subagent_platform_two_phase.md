---
name: SDD subagent platform phased direction
description: User wants a robust SDD+subagent workflow as a personal AI development platform with staged platformization.
type: project
originSessionId: 38f39517-48f3-48e9-8d84-3975818f3a9a
---
用户目标是做自己的 SDD + subagent 工作流，战略目标更接近个人 AI 开发平台，而不只是轻量 `/sdd-do`。

**Why:** 用户明确表示“不要考虑最小化改造，而是最稳最全的改造”，并指出 Oh My OpenCode 里的理念、skill、tools、plugins、agent 接入都很有意思；随后确认“3 是比较完美的”，即个人 AI 开发平台优先。

**How to apply:** 后续讨论或落文档时按分阶段平台路线组织：Phase 1 先用 SDD 闭环验证，同时支持后台只读/审查/验证任务来保护主会话上下文窗口；Phase 2 是 AI 工具入口投影与全局安装接入（global CLI、project init/update、tool adapter、generated skills/commands、instruction API、doctor drift check），这是 Spec Kit、GSD、OpenSpec、Oh My OpenCode/OpenAgent 的共同模式，不按单一项目命名；Phase 3 再扩展成更完整的 harness/tool/plugin/agent 生态与并发隔离；Phase 4 补齐 npm published package / public install baseline；Phase 5 再进入代码知识图谱。Phase 1 已定边界：双事实源、受控写回 proposal、7 角色 agent registry、提示词式 operating guidelines 而非 tool registry、state.json + events.jsonl、文件型 artifacts、默认不做 worktree、goal-level validator、轻量 sdd-doctor、6 个入口命令、.sdd/project.yml 轻量项目适配。Agent Orchestration 是平台一等能力：不同 agent 可按任务类型使用相同或不同模型，Phase 1 先按 TypeScript/Node 平台编排层推进；Go runner/supervisor 是否下沉顺延到 Phase 3 再议。不要再默认收敛成最小本地 skill 改造。
