---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.1.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-tasks
sdd_source: sdd-agent-platform
sdd_hash: sha256:41a883e9dea22737aab06cf4d6753a91948b7ba1c5f5cc0ad535178862d52a6d
---

Create if missing during init, otherwise refine existing graph-ready SDD task blocks from an approved spec and plan.

Run:

```bash
sdd instructions tasks --json
sdd tasks format
```

Use the helper command output as the canonical format reference, keep companion sections such as #### Boundary and #### Acceptance outside the fenced metadata block, then follow the returned CLI/core instruction payload.
