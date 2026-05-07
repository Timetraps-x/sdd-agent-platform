# Phase 2.6 Doctor Drift Check 与 Update Check 模式

## 1. 定位

Phase 2.6 扩展 `sdd doctor`，让它能诊断 generated AI tool entries 的缺失、漂移、版本过期和 foreign conflict，并与 `sdd update --check` 形成闭环。

## 2. 依赖

```yaml
depends_on:
  - phase-2.2-ai-tool-adapter-registry
  - phase-2.3-init-update-generated-entries
blocks:
  - phase-2.7-entry-projection-e2e
```

## 3. 范围

- doctor 增加 AI entry checks。
- 检查 Claude Code generated entries 是否存在。
- 检查 metadata contract/version/hash 是否匹配。
- 检查 foreign/conflict 文件。
- `sdd update --check` 与 doctor drift 结果语义一致。
- report action 给出 `Run sdd update` 或手动处理 conflict 的建议。

## 4. 非目标

- doctor 不自动修复。
- 不删除 foreign files。
- 不执行 global install/uninstall。
- 不检查 Phase 3 plugin/worktree/dashboard。

## 5. 交付物

- doctor AI entry drift checks。
- `sdd update --check` exit code 语义稳定。
- drift/missing/conflict tests。
- `specs/master/phase2.6-{spec,plan,tasks,validation}.md`。

## 6. 验收标准

- fresh init 后 doctor AI entry checks PASS。
- 删除 managed entry 后 doctor FAIL，并建议 `sdd update`。
- 修改 managed entry 后 doctor FAIL/WARN，并建议 `sdd update`。
- foreign conflict 不被覆盖，doctor 给出可操作提示。
- Typecheck/tests/build 通过。

## 7. 可被下游引用的产物

```yaml
phase_artifact: specs/master/phases/phase-2.6-doctor-drift-check.md
required_by:
  - phase-2.7-entry-projection-e2e
```
