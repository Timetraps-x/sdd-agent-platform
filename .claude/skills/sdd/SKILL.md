---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: skill
sdd_artifact_id: sdd
sdd_source: sdd-agent-platform
sdd_hash: sha256:6bfa5c568353d2a733107042981d3450ffaa32449f580f76b473dab7eeac6352
---

# SDD Platform

Use the local or globally installed `sdd` CLI as the source of truth for this repository's SDD workflow. This skill is the manual `/sdd` root intent router; do not treat this generated file as the workflow brain.

1. Accept the user's natural-language intent, then run `sdd status` first and report only workflow state, blocker/current task, and the recommended next command; do not paste or restate full status unless asked.
2. Run `sdd instructions overview --json` only when the next action is unclear or you need the full dynamic command contract.
3. Dynamic routing comes from CLI/core output, not this skill text; follow the recommended next command before choosing a dedicated `/sdd:*` entry.
4. If the intent is still ambiguous after status, ask one clarifying question before spec/plan/do/test/sync-back/ship work.
5. For risky requests that mention state-machine, concurrency, database, SQL, security, API/schema, CI/build, or external unknowns, run `sdd lifecycle decide --from-text <text>` before spec/plan work.
6. If status reports workflow_status=not_started, use `/sdd:spec` to create the current Git branch partition; do not use `sdd init` as the workflow branch entry.
7. If status points to gaps, drift, or doctor/update work, handle that maintenance action before do/test/ship.
8. If status recommends a task, run `sdd tasks inspect <task_id>` and use the task Boundary and Acceptance before offering `/sdd:do`.
9. If status recommends do, test, or sync-back, follow the dedicated `/sdd:do`, `/sdd:test`, or `/sdd:sync-back` entry instead of inferring completion from chat.
10. If status recommends sync-back, use `/sdd:sync-back` to run `sdd sync-back inspect --branch <branch> --task <task_id>` first and follow apply_policy; pass an explicit run id only for replay/CI/old-run inspection. Direct-safe tasks may apply directly, confirm-required tasks need human confirmation and `--approved`.
11. If the user asks to release or go online, use `/sdd:ship` / `sdd ship --branch <branch> --dry-run` for local readiness first; do not publish, push, tag, or create external release state without explicit confirmation.

Refresh this managed skill with `sdd update` when drift is reported.
