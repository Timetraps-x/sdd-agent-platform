---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-root
sdd_source: sdd-agent-platform
sdd_hash: sha256:0dd7ccb3c47f2c95d229dd922af1eea6a41c93d2c1adc57bdf8af390c5752198
---

Use SDD as the natural-language intent router for this repository while keeping CLI/core output as the source of truth.

1. Accept the user's natural-language intent, then run `sdd status` first and report only workflow state, blocker/current task, and the recommended next command; do not paste or restate full status unless asked.
2. Dynamic routing comes from CLI/core output, not this generated markdown; follow the recommended next command before choosing a dedicated `/sdd:*` entry.
3. If the intent is still ambiguous after status, ask one clarifying question before spec/plan/do/verify/sync-back/ship work.
4. For risky requests that mention state-machine, concurrency, database, SQL, security, API/schema, CI/build, or external unknowns, run `sdd lifecycle decide --from-text <text>` before spec/plan work.
5. If status reports workflow_status=not_started, use `/sdd:spec` to create the current Git branch partition; do not use `sdd init` as the workflow branch entry.
6. If status points to gaps, drift, or doctor/update work, handle that maintenance action before do/verify/ship.
7. If status recommends a task, run `sdd tasks inspect <task_id>` and use the task Boundary and Acceptance before offering `/sdd:do`.
8. If status recommends do, verify, or sync-back, follow the dedicated `/sdd:do`, `/sdd:verify`, or `/sdd:sync-back` entry instead of inferring completion from chat.
9. If status recommends sync-back, use `/sdd:sync-back` to run `sdd sync-back inspect --branch <branch> --task <task_id>` first and follow apply_policy; pass an explicit run id only for replay/CI/old-run inspection. Direct-safe tasks may apply directly, confirm-required tasks need human confirmation and `--approved`.
10. If the user asks to release or go online, use `/sdd:ship` and `checklist.md`; do not publish, push, tag, or create external release state without explicit confirmation.
