---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.2.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-verify
sdd_source: sdd-agent-platform
sdd_hash: sha256:0d8f673a4a468f407aff70f352f19b1b867537af70e0842d84fedde5c9647a61
---

Verify task acceptance coverage from review and validation evidence. By default, verify resolves the latest eligible run from the current/requested partition plus task id; pass `--run <run_id>` only for replay, CI, or old-run inspection.

Run:

```bash
sdd status
sdd instructions verify --json
```

Workflow:

1. Resolve exactly one task id and workflow partition from `sdd status`, the recommended command, or the user request. Stop and ask if either is ambiguous.
2. Omit `--run` by default so CLI/core resolves the latest eligible partition/task run; inspect an explicit run only when the user or CI names one.
3. Ensure the validator artifact includes exact task Acceptance text, preferably generated with `sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator`; pass the run-relative artifact path while storing the physical file under `.sdd/runs/<run_id>/artifacts/`.
4. Run `sdd artifact validate <run_id> <artifact> --task <task_id> --agent validator` before goal-level verify.
5. Run `sdd verify task <task_id> --branch <branch>` for goal-level acceptance coverage, adding `--run <run_id>` only for explicit old-run replay.
6. If verify PASS, run `sdd sync-back inspect --branch <branch> --task <task_id>` and follow apply_policy.
7. Direct-safe tasks may run `sdd sync-back apply --branch <branch> --task <task_id>` directly; confirm-required tasks require human confirmation and `--approved` before writing `tasks.md`.

Do not auto-fix failures, force push, or mark completed when blocking gaps remain.
