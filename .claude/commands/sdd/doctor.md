---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.1.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-doctor
sdd_source: sdd-agent-platform
sdd_hash: sha256:f644b260a6134587e13f8af625951e0ee784c8213e11ca8c42abf4592de1647e
---

Check project config, scoped run evidence, generated AI entry drift, and use sdd run archive <run_id> for failed exploratory runs.

Run:

```bash
sdd instructions doctor --json
```

Then follow the returned CLI/core instruction payload.
