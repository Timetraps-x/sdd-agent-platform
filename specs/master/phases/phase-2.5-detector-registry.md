# Phase 2.5 Detector Registry 与 Mixed Stack 识别

## 1. 定位

Phase 2.5 将 Phase 1 临时项目识别逻辑演进为 detector registry，支持 evidence、confidence、mixed stack 和 validation command recommendation，避免按文件顺序硬编码判断项目类型。

## 2. 依赖

```yaml
depends_on:
  - phase-2.0-ai-tool-entry-projection
blocks:
  - phase-2.7-entry-projection-e2e
```

## 3. 范围

- 新增 `packages/core/src/detectors.ts`。
- 定义 `ProjectDetector`、`ProjectDetectionCandidate`、`DetectionEvidence` contract。
- 迁移现有 Java/Maven/SSM 与 Node/TypeScript evidence scoring。
- 支持 confidence：high、medium、low。
- 支持 mixed stack：primary + candidates。
- `.sdd/project.yml` 保留旧 `project.language/framework` 字段，同时新增可选 `detection` section。
- read parser 容忍没有 `detection` 的旧配置。

## 4. 非目标

- 不穷尽 Python/Go/Rust 等所有 detector。
- 不引入外部扫描数据库。
- 不让 detector 自动修改业务代码或构建文件。

## 5. 交付物

- detector registry 实现。
- Java Maven multi-module 与 mixed Java/Node 回归测试。
- `.sdd/project.yml` detection section render/parse。
- `specs/master/phase2.5-{spec,plan,tasks,validation}.md`。

## 6. 验收标准

- 当前 Maven multi-module 和 mixed Java/Node 测试继续通过。
- detector 输出 evidence/confidence。
- mixed repo 能识别 primary stack 和 secondary/tooling stack。
- validation.default 与 primary stack 匹配。
- Typecheck/tests/build 通过。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-2.5-detector-registry.md
required_by:
  - phase-2.7-entry-projection-e2e
```
