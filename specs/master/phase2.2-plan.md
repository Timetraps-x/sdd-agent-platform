# Phase 2.2 AI Tool Adapter Registry 与 Claude Code Adapter Plan

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.2-ai-tool-adapter-registry.md` 的执行 plan。

## 1. 实施步骤

1. 新增 `ai-tools.ts` 承载 adapter registry 与 projection logic。
2. 实现 Claude Code adapter 的 skill/command entry templates。
3. 通过 frontmatter 写入 managed metadata。
4. 对现有文件执行 managed/foreign/contract/hash 检查。
5. check-only 模式只报告 missing/drifted，不写入。
6. 写入模式只创建或刷新 managed entry，不覆盖 foreign entry。
7. 在 `index.ts` re-export AI tool API。

## 2. 修改文件

- `packages/core/src/ai-tools.ts`
- `packages/core/src/index.ts`
- `packages/core/src/index.test.ts`

## 3. 验证命令

```bash
npm run typecheck
npm test
```
