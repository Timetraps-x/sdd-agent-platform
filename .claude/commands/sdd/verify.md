---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.1.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-verify
sdd_source: sdd-agent-platform
sdd_hash: sha256:45ad4815afcf455d4408482f03dd922f62f70b3d80457720df3599431288879e
---

Verify task acceptance coverage from review and validation evidence.

Run:

```bash
sdd status
sdd run inspect <run_id>
sdd instructions verify --json
```

Workflow:

1. Resolve exactly one run id and task id from `sdd status`, the latest run, or the user request. Stop and ask if either is ambiguous.
2. Inspect `sdd run inspect <run_id>` before verifying so state, events, artifacts, validation, and sync-back are visible.
3. Ensure the validator artifact includes exact task Acceptance text, preferably generated with `sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator`.
4. Run `sdd artifact validate <run_id> <artifact> --task <task_id> --agent validator` before goal-level verify.
5. Run `sdd verify task <task_id> --run <run_id>` for goal-level acceptance coverage.
6. If verify PASS, run `sdd sync-back inspect <run_id> --task <task_id>` and follow apply_policy.
7. Direct-safe tasks may run `sdd sync-back apply` directly; confirm-required tasks require human confirmation and `--approved` before writing `tasks.md`.

Do not auto-fix failures, force push, or mark completed when blocking gaps remain.
