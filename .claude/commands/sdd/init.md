---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.1.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-init
sdd_source: sdd-agent-platform
sdd_hash: sha256:7c549f4e69b690a196a786b8123de3a03dd085e9e57d38e0c998da0829d92e85
---

Initialize or refresh the SDD project configuration, starter semantic documents, and generated AI entries.

Run:

```bash
sdd init --ai claude-code
sdd status
```

Default init creates `.sdd/project.yml`, `.sdd/runs/`, starter `specs/<branch>/spec.md`, `plan.md`, `tasks.md`, and managed Claude Code entries. Existing semantic documents are preserved unless `--force` is explicit.

Then follow the returned CLI/core instruction payload and refine the starter docs before implementation.
