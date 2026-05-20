---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-test
sdd_source: sdd-agent-platform
sdd_hash: sha256:ed5e15bd26d5c3f8bd614cd1a94658f5597e985fbcafa2cd39c5eb401ec84f43
---

Execute task validation commands, capture command output, evaluate acceptance evidence coverage, and return one unified test judgment for the task.

Run:

```bash
sdd status
sdd instructions test --json
sdd verifies inspect --branch <branch>
sdd test task <task_id> --branch <branch>
```

Workflow:

1. Confirm `verify.md` exists and is current for the selected branch.
2. Run `sdd test task <task_id> --branch <branch>` to execute task validation commands and evaluate mapped acceptance coverage; use `--command` only for a deliberate narrowed override.
3. Treat generated command logs, test index, validator artifact, and unified evidence projection as runtime evidence references, not as workflow documents.
4. If `/sdd:test` returns PASS, proceed to `/sdd:sync-back` / `sdd sync-back inspect`; if it returns FAIL or BLOCKED, fix the reported command or evidence gaps and rerun `/sdd:test`.

Do not auto-fix failures, create sync-back proposals, commit, publish, or treat command success alone as semantic PASS.
