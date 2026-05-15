---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-sync-back
sdd_source: sdd-agent-platform
sdd_hash: sha256:971b4c0ceda793c6b4b3d75da5958822a846f100b347ada6cda2112d07462c82
---

Inspect and optionally apply the verified task completion proposal back into tasks.md. Sync-back is a document write-back gate, not another implementation step.

Run:

```bash
sdd status
sdd instructions sync-back --json
sdd sync-back inspect --branch <branch> --task <task_id>
```

Workflow:

1. Resolve exactly one task id and workflow partition from `sdd status`, the recommended command, or the user request. Stop and ask if either is ambiguous.
2. Run `sdd sync-back inspect --branch <branch> --task <task_id>` before any apply; pass `<run_id>` only for replay, CI, or old-run inspection.
3. Report what apply would write: target tasks file, task id, markdown status transition, proposal path, evidence artifacts, apply_policy, and policy reasons.
4. If inspect reports `status=ready` and `apply_policy=direct`, run `sdd sync-back apply --branch <branch> --task <task_id>`.
5. If inspect reports approval_required=true, ask for explicit human confirmation and only then run `sdd sync-back apply --branch <branch> --task <task_id> --approved`.
6. Explain that apply writes only tasks.md for the target task, appends the sync-back implementation note, marks run sync_back applied, and rebuilds the local run index.

Do not apply without inspect, do not use `--approved` without human confirmation, and do not change source files during sync-back.
