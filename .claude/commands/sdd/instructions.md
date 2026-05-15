---
sdd_managed: true
sdd_contract: sdd-ai-entry-v1
sdd_version: "0.3.0"
sdd_tool: claude-code
sdd_artifact_kind: command
sdd_artifact_id: sdd-instructions
sdd_source: sdd-agent-platform
sdd_hash: sha256:5b36bdece9e9b63bbc377fee1427cdbb5469b544b3262ac7ea26cdc0c6a44857
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
- **If status recommends verify or sync-back**: use the task id and partition from status/recommended command; omit `--run` unless an explicit run is named for replay, CI, or old-run inspection.
- **If the next change has state-machine, concurrency, database, SQL, security, API/schema, CI/build, or external unknown risk**: run `sdd lifecycle decide --from-text <text>` and respect hard gates before spec/plan work.
- **After a task completes**: run `sdd verify task <task_id> --branch <branch>` for acceptance coverage; CLI/core resolves the latest eligible run.
- **After verify PASS**: use `/sdd:sync-back` to run `sdd sync-back inspect --branch <branch> --task <task_id>` and follow apply_policy: direct-safe tasks may apply directly, confirm-required tasks need human confirmation and `--approved`.

Report only the selected next action, blockers, and commands you will run; do not paste full JSON/status output unless the user asks. Do not loop in maintenance checks when status already gives a next workflow action.
