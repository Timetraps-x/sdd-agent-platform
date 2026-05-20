---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-do
sdd_source: sdd-agent-platform
sdd_hash: sha256:832cee7b42b121184a1ece224ad5967551113237da19369147f6de1923667892
---

Execute one approved SDD task boundary through the ingestion-aware task workflow.

Run:

```bash
sdd status
sdd instructions do --json
sdd tasks inspect <task_id>
```

Workflow:

Agent evidence flow: scout gathers bounded context only; implementer edits only inside the selected task boundary; reviewer records review evidence; debugger is optional after review failure; validator records validation and acceptance mapping. Artifact flags use run-relative paths such as `artifacts/implement-<task_id>.md`, `artifacts/review-<task_id>.md`, and `artifacts/validation-<task_id>.md`; physical files live under branch evidence `.sdd/runs/<branchSlug>/evidence/artifacts/`. This command entry does not authorize autonomous background execution.


1. Resolve exactly one task id from the user request or from the `sdd status` recommended next command. Stop and ask if it is ambiguous.
2. Read `sdd tasks inspect <task_id>` and restate the task Boundary, Acceptance, gaps, and validation commands.
3. Work only inside the selected task boundary; do not expand scope without a checkpoint.
4. Before creating explicit result artifacts, use templates such as `sdd artifact template artifacts/implement-<task_id>.md --task <task_id> --agent implementer`, `sdd artifact template artifacts/review-<task_id>.md --task <task_id> --agent reviewer`, and `sdd artifact template artifacts/validation-<task_id>.md --task <task_id> --agent validator`; save the physical file under branch evidence `.sdd/runs/<branchSlug>/evidence/artifacts/`, pass the run-relative `artifacts/<file>` path to CLI flags, and keep source/test files in `## Evidence`, not in `sdd-result.artifacts`.
5. Run `sdd artifact validate <run_id> <artifact> --task <task_id> --agent <agent>` before passing artifacts into `sdd do task <task_id>`.
6. Run `sdd do task <task_id>` with explicit artifact paths when evidence is available; this path records Phase 3 artifact ingestion evidence for doctor.
7. Report the run id, status, agent evidence artifacts, gaps, and next gate. If completed, recommend `/sdd:test` / `sdd test task <task_id> --branch <branch>` so command execution and acceptance coverage are judged together.

Do not create worktrees, auto commit, or mark missing evidence as PASS.
