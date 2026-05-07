---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.1.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-spec
sdd_source: sdd-agent-platform
sdd_hash: sha256:b961d1c2550ad2e6b38a3d4702e294327150394e79b4df4a0720aebf534107d7
---

Create if missing during init, otherwise refine the existing SDD spec document for requirements, scope, non-goals, and acceptance.

Run:

```bash
sdd instructions spec --json
```

Then follow the returned CLI/core instruction payload.
