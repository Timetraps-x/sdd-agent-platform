---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: skill
sdd_artifact_id: sdd
sdd_source: sdd-agent-platform
sdd_hash: sha256:c6ac39f38dbc866ecf1a77b2c8aea2053886a8d86b97c1db605d0e43154fb493
---

# SDD Platform

Use the local or globally installed `sdd` CLI as the source of truth for this repository's SDD workflow.

Start by running `sdd status`. Run `sdd instructions overview --json` only when the next action is unclear or you need the full dynamic command contract.

Use `sdd status` for branch/source context and the recommended next command, but summarize only blockers, current task, and next action instead of replaying the full status output. For risky changes, run `sdd lifecycle decide --from-text <text>` before spec/plan work. Respect the returned boundaries. Do not treat this generated file as the workflow brain; refresh it with `sdd update` when drift is reported.
