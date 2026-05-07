---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.1.0"
sdd_tool: claude-code
sdd_artifact_kind: skill
sdd_artifact_id: sdd
sdd_source: sdd-agent-platform
sdd_hash: sha256:2dfc69dd58aaf54e7a0af2f091ba493ba6a2ed6ffa82c69397f53d6f9ea59a6d
---

# SDD Platform

Use the local or globally installed `sdd` CLI as the source of truth for this repository's SDD workflow.

Start by running:

```bash
sdd status
sdd instructions overview --json
```

Respect the returned boundaries. Do not treat this generated file as the workflow brain; refresh it with `sdd update` when drift is reported.
