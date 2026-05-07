---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.1.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-plan
sdd_source: sdd-agent-platform
sdd_hash: sha256:3ee45f1ddc31e83bdc246a87968de41363b7e0e8d45d52462316e01ddf37c0d8
---

Create if missing during init, otherwise refine the existing SDD plan document for approach, impact, risks, and validation strategy.

Run:

```bash
sdd instructions plan --json
```

Then follow the returned CLI/core instruction payload.
