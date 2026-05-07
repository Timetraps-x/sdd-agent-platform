---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.1.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-instructions
sdd_source: sdd-agent-platform
sdd_hash: sha256:f8815f8fe67c38d28aab0cfd2320aa4d3c15a37346a989083cb7d73138a65e01
---

Fetch dynamic SDD instructions and follow the status-first decision tree to the next actionable step.

Run:

```bash
sdd status
sdd instructions overview --json
```

Then apply this decision tree:

- **If status reports gaps or drift**: run the recommended command. For generated entry drift, run `sdd update`, then `sdd doctor` again.
- **If status recommends a task**: run `sdd tasks inspect <task_id>`, then offer `/sdd:do` inside the approved task boundary.
- **If status recommends run inspection**: run `sdd run inspect <run_id>` and report state, events, artifacts, validation, and sync-back.
- **After a task completes**: run `sdd verify task <task_id> --run <run_id>` for acceptance coverage.
- **After verify PASS**: run `sdd sync-back inspect <run_id> --task <task_id>` and follow apply_policy: direct-safe tasks may apply directly, confirm-required tasks need human confirmation and `--approved`.

Always report the result to the user. Do not loop in maintenance checks when status already gives a next workflow action.
