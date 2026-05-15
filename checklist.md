# 上线 Checklist

本 checklist 用于 `/sdd:ship` 上线前检查。它是 release-readiness gate，不授权自动发布、推送、打 tag 或创建外部 release。

## 1. 范围确认

- [ ] 确认目标分支 / partition。
- [ ] 确认本次上线版本号、变更范围和发布目标。
- [ ] 确认没有未说明的 scope expansion。
- [ ] 确认需要人工决策的发布动作已单独获得批准。

## 2. SDD 工作流状态

```bash
sdd status --branch <branch>
sdd tasks list --branch <branch>
```

- [ ] 必须上线的任务已 completed，或明确 deferred / out of scope。
- [ ] verify PASS 后没有未处理的 sync-back proposal。
- [ ] 若存在 confirm-required sync-back，已先 inspect 并获得明确人工确认。
- [ ] 当前分支与目标 partition 一致，或差异已解释。

## 3. Managed AI entries

```bash
sdd update --check
```

- [ ] `.claude/**` managed entries 无 drift / missing / user-modified 阻塞。
- [ ] 如有 drift，先运行 `sdd update`，再重新检查。
- [ ] 不手工改写 managed generated entries，除非是在修复 source projection。

## 4. 当前证据健康检查

```bash
sdd doctor --latest-only
```

- [ ] 当前 run evidence、artifact、sync-back 状态无阻塞。
- [ ] historical doctor / trust legacy debt 不自动作为上线阻塞，除非影响当前上线证据。
- [ ] 如需历史审计，再单独运行 `sdd doctor --all-runs`。

## 5. 本地验证

```bash
npm run typecheck
npm test
npm run build
```

- [ ] TypeScript typecheck 通过。
- [ ] 测试通过。
- [ ] 构建通过。
- [ ] 若跳过任何验证，必须记录原因和风险。

## 6. Package dry-run

```bash
npm pack --dry-run --json
```

- [ ] package contents 符合预期。
- [ ] CLI bin、dist、commands、agents、templates、workflows、docs 中需要发布的文件已包含。
- [ ] 未包含不应发布的临时文件、敏感文件或本地运行产物。

## 7. Git 状态

```bash
git status
```

- [ ] 工作区变更已审阅。
- [ ] 未跟踪文件没有意外进入发布范围。
- [ ] commit / tag / push 需要用户单独确认。

## 8. 发布前人工确认

- [ ] 确认发布版本号。
- [ ] 确认发布渠道。
- [ ] 确认是否需要更新 changelog / release notes。
- [ ] 确认是否执行 `npm publish`。
- [ ] 确认是否执行 `git tag` / `git push` / GitHub release。

## 9. `/sdd:ship` 报告格式

`/sdd:ship` 应按以下结构报告：

```text
Ship readiness: PASS|BLOCKED
branch=<branch>
version=<version-or-n/a>

Checklist:
- SDD workflow: PASS|BLOCKED
- Managed AI entries: PASS|BLOCKED
- Current evidence health: PASS|BLOCKED
- Typecheck: PASS|BLOCKED
- Tests: PASS|BLOCKED
- Build: PASS|BLOCKED
- Package dry-run: PASS|BLOCKED
- Git state: PASS|BLOCKED
- Manual confirmations: PASS|BLOCKED

Blocking issues:
- <exact failed command or unresolved confirmation>

Next action:
- <safe next command or human confirmation needed>
```

`/sdd:ship` 只做上线前检查。真实发布动作必须由用户明确单独授权。
