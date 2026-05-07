---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.1.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-root
sdd_source: sdd-agent-platform
sdd_hash: sha256:5dc4db6b5171424e306a87c07f715c6c4f62cd71c4ca666f417577cb63060cfa
---

Run the SDD platform workflow entrypoint for this repository.

1. Run `sdd status` and report documents, task counts, latest run, gaps, and the recommended next command.
2. Follow the recommended next command from CLI/core output; do not infer dynamic state from this generated markdown.
3. If status points to the starter `ONBOARDING-1` task, refine or replace the existing starter docs under `specs/<branch>/`; do not create parallel documents.
4. If status points to gaps, drift, or doctor/update work, handle that maintenance action before do/verify.
5. If status recommends a task, run `sdd tasks inspect <task_id>` and use the task Boundary and Acceptance before offering `/sdd:do`.
6. If status recommends sync-back, run `sdd sync-back inspect <run_id> --task <task_id>` and follow apply_policy: direct-safe tasks may apply directly, confirm-required tasks need human confirmation and `--approved`.
