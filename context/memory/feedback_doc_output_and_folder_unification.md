---
name: doc output language and folder unification
description: Global preference: generated docs should be in Chinese, and skill/plugin outputs should be consolidated under one top-level folder pattern instead of being scattered.
type: feedback
---
文档产出默认使用中文，尤其是 `/spec` skill 相关文档不要再输出英文；同时，Claude Code 使用的 skill / plugin 等产出的文档应尽量统一放到一个大的顶层文件夹下面，参考 `/spec` 的做法，不要分散到多个零碎目录。

**Why:** 英文文档不符合用户当前协作习惯；文档目录分散会让整理和维护非常麻烦。

**How to apply:** 未来只要是我生成的规划、设计、任务、说明类文档，优先中文输出；涉及 skill/plugin 产物落盘时，优先采用统一顶层目录方案，避免东一个文件夹西一个文件夹，除非工具自身机制强制限制。