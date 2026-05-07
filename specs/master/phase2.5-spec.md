# Phase 2.5 Detector Registry 与 Mixed Stack 识别 Spec

## 0. Phase Artifact

本文件是 `specs/master/phases/phase-2.5-detector-registry.md` 的执行 spec。

## 1. 目标

把项目识别从内联先后判断改为 detector registry，以 evidence、score、confidence 和 mixed-stack 输出作为 contract。

## 2. 范围

- 在 `packages/core/src/index.ts` 中定义 detector contract。
- 首批 detector：`java-ssm-maven-multimodule`、`typescript-node`。
- 输出 `DetectionEvidence`、`ProjectDetectionCandidate`、`ProjectDetection`。
- `.sdd/project.yml` 增加可选 `detection` section。
- 旧项目 config parser 容忍没有 `detection` section。

## 3. 非目标

- 不逐个硬编码所有语言生态。
- 不引入外部扫描服务。
- 不执行构建命令来判断项目类型。

## 4. 验收标准

- Maven multi-module Java 项目识别为 `java / ssm-maven-multimodule`。
- Java + Node tooling mixed repo 仍以 Java 业务源码为 primary，同时 `mixed_stack: true`。
- config 中写入 `detection.primary`、`confidence`、`candidates`。
- parser 对旧 config 无 detection 的情况保持兼容。
