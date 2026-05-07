---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.1.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-do
sdd_source: sdd-agent-platform
sdd_hash: sha256:241b7efe295fbf73b30c49d6b8f8d54b4c0c782d0c5f36422a085c7761fa6d71
---

Execute one approved SDD task boundary through the ingestion-aware task workflow.

Run:

```bash
sdd status
sdd instructions do --json
sdd tasks inspect <task_id>
```

Workflow:

1. Resolve exactly one task id from the user request or from the `sdd status` recommended next command. Stop and ask if it is ambiguous.
2. Read `sdd tasks inspect <task_id>` and restate the task Boundary, Acceptance, gaps, and validation commands.
3. Work only inside the selected task boundary; do not expand scope without a checkpoint.
4. Before creating explicit result artifacts, use `sdd artifact template artifacts/<agent>-<task_id>.md --task <task_id> --agent <agent>` and keep source/test files in `## Evidence`, not in `sdd-result.artifacts`.
5. Run `sdd artifact validate <run_id> <artifact> --task <task_id> --agent <agent>` before passing artifacts into `sdd do task <task_id>`.
6. Run `sdd do task <task_id>` with explicit artifact paths when evidence is available; this path records Phase 3 artifact ingestion evidence for doctor.
7. Report run id, status, artifacts, and gaps. If completed, recommend `sdd verify task <task_id> --run <run_id>`.

Do not create worktrees, auto commit, or mark missing evidence as PASS.
