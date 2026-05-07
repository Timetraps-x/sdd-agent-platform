# sdd-agent-platform Claude Context

本项目是用户自建的 SDD + subagent workflow 平台，不是 EMP 业务项目的一部分。

## 必读上下文

开始设计或实现前，优先读取：

- `context/memory/MEMORY.md`
- `docs/research/自建_SDD_subagent_工作流平台方案.md`

如果涉及外部方案复核，再读取：

- `docs/research/支持_subagent_的_SDD_工作流深度分析报告.md`
- `docs/research/支持_subagent_的_SDD_工作流调研.md`

## 当前已定方向

- Phase 1 使用 TypeScript / Node.js 做平台编排层。
- Phase 2 已调整为 AI 工具入口投影与全局安装接入；Go runner / supervisor 是否下沉顺延到 Phase 3 平台化扩展再评估。
- Rust 暂不作为 Phase 1 选项。
- 平台代码独立；业务仓库只接入 `.sdd/project.yml`、`specs`、`runs`、`artifacts`。
- 核心原则：阶段推进可控，阶段内 agent / skill / plugin / tool 调用可自动化。
- 避免成为大 prompt 工程：用 contract、state/events、artifacts、project.yml、checkpoint/gap/liveness 机制承载平台逻辑。
- Phase 2 命名为 AI 工具入口投影：全局 CLI、project init/update、AI tool adapter、generated skills/commands、instruction API、doctor drift check；这是 Spec Kit、GSD、OpenSpec、Oh My OpenCode/OpenAgent 的共同模式，不按单一项目命名。

## 实施偏好

- 文档默认中文。
- UTF-8 文本编辑优先使用 hashline-edit，native Edit 作为 fallback。
- 外部 GitHub 研究优先看源码、issues、raw files，不只看 README。
- 不把 Oh My OpenCode / GSD / Spec Kit / cc-sdd 的实现直接照搬；先复核机制，再转译成本项目 contract。
