# Phase 6.0 Tasks: Agent / Skill / Team Runtime Harness

## Metadata

- phase_id: `6.0`
- plan_id: `phase6.0-agent-skill-team-runtime-harness-plan`
- status: `completed`

## Tasks

### P6.0-T1: Define agent / skill / team runtime contracts

```sdd-task
id: P6.0-T1
status: completed
risk: api_schema
autonomy: compact_boundary_only
agent_fit: architect, reviewer
allowed_agents: architect, reviewer
required_artifacts: artifacts/phase6.0-contract-review.md
verification_availability: inspect:sdd status --branch master
```

- Define AgentProfileContract, SkillCapabilityContract, CapabilitySourceCatalog, ExternalAgentPackImportPolicy, ToolPermissionSpec, HostAdapterContract, AgentRouterContract, ModelPolicyContract, TeamModePolicy, DelegationWavePolicy, AgentExecutionRecord, TeamSessionRecord, TeamMessageRecord, ExecutionTrajectory, EvidenceIngestionContract, and SkillReusePolicy.
- Keep contracts host-neutral and SDD-owned.
- Do not copy Oh My OpenAgent/OpenCode, agency-agents, SuperClaude, wshobson, Roo/Cline, cc-sdd or other external prompt/persona files directly.
- Make anti-big-prompt and external material quarantine rules part of the contract surface.
- Evidence: core exposes Phase 6 profile/capability/source/quarantine/tool-permission/host-adapter/router/team-mode/evidence contracts through `sdd agent-runtime inspect|validate`; validation passed with `npm test`, `npm run build`, and `npm run sdd -- agent-runtime validate`.

### P6.0-T2: Build reusable capability and external material catalog

```sdd-task
id: P6.0-T2
status: completed
risk: external_unknown
autonomy: research_before_implementation
agent_fit: researcher, architect
allowed_agents: researcher, architect
required_artifacts: artifacts/phase6.0-skill-reuse-catalog.md
verification_availability: inspect:sdd status --branch master
```

- Catalog native/open-source wheels to reuse first: Claude Code agents/skills/commands/MCP, project `.claude/skills`, Context7, Playwright, ripgrep/glob/ast-grep/LSP, OpenCode/Oh My adapter concepts.
- Catalog external material/mechanism sources: Roo/Cline, cc-sdd, agency-agents, wshobson/BuildWithClaude, levnikolaevich Claude skills, Aider/SWE-agent, Continue/OpenHands/SuperClaude, CrewAI/AutoGen/LangGraph.
- Define when the platform is allowed to build a missing bridge.
- Record source attribution, reuse/adapt/borrow/avoid decisions, build-vs-borrow reasons, quarantine requirements, and anti-big-prompt rules.

### P6.0-T3: Add external material quarantine inspect boundary

```sdd-task
id: P6.0-T3
status: completed
depends_on: P6.0-T1, P6.0-T2
risk: security, external_unknown
autonomy: research_before_implementation
agent_fit: implementer, reviewer, validator
allowed_agents: implementer, reviewer, validator
required_artifacts: artifacts/phase6.0-external-pack-import.md
verification_availability: inspect:sdd status --branch master
```

- Add a CLI/core inspect boundary such as `sdd capabilities inspect-source <source_id>` or equivalent.
- External agent packs must show source, license, trust/quarantine status, hidden Unicode scan, secret scan, dangerous command scan, SDD mapping status, allowed profiles, risk ceiling, and import denial/approval reason.
- Do not execute or route external agent material in this task.
- Evidence: `sdd external-packs inspect agency_agents_material` reports quarantine status, allowed profiles, risk ceiling, mapping status, and required checks including license/source attribution, hidden Unicode, secret, dangerous command, and SDD frontmatter mapping.

### P6.0-T4: Add router inspect boundary

```sdd-task
id: P6.0-T4
status: completed
depends_on: P6.0-T1, P6.0-T2, P6.0-T3
risk: api_schema
autonomy: compact_boundary_only
agent_fit: implementer, reviewer
allowed_agents: implementer, reviewer, validator
required_artifacts: artifacts/phase6.0-router-inspect.md
verification_availability: inspect:sdd status --branch master
```

- Add a CLI/core boundary such as `sdd tasks route <task_id>` or equivalent inspect output.
- Router output must show category, recommended profile, allowed profiles, rejected profiles, source capability, reuse decision, required capabilities, tool permission summary, autonomy ceiling, required artifacts, team-mode decision, blocked reason, and next action.
- Router must use task metadata fields `agent_fit`, `allowed_agents`, `risk`, `autonomy`, `required_artifacts`, and `verification_availability` as internal mechanism inputs.
- This task may be implemented before actual host execution.
- Evidence: `sdd tasks route ONBOARDING-1 --branch master` emits category, recommended/allowed profiles, required capabilities, source capability, reuse decision, tool permission, autonomy ceiling, team-mode decision, required artifacts, and next action.

### P6.0-T5: Add tool permission and anti-big-prompt projection policy

```sdd-task
id: P6.0-T5
status: completed
depends_on: P6.0-T4
risk: security, api_schema
autonomy: compact_boundary_only
agent_fit: implementer, reviewer, validator
allowed_agents: implementer, reviewer, validator
required_artifacts: artifacts/phase6.0-tool-permission-projection.md
verification_availability: inspect:sdd status --branch master
```

- Implement ToolPermissionSpec inspect/output mapping for tool groups, file scopes, allow/deny/ask policy, approval policy, and runtime validation requirement.
- Ensure external material is represented as structured metadata and short host prompt projection, not bulk copied prompt text.
- Include blocked reasons for capabilities that fail quarantine, exceed risk ceiling, or require tools unavailable in the host.
- Evidence: router output includes `ToolPermissionSpec` summary (`profile`, `policy`, `groups`, approval policy) and external packs remain quarantined until structured metadata checks pass, preserving anti-big-prompt boundaries.

### P6.0-T6: Add optional team-mode inspect and policy boundary

```sdd-task
id: P6.0-T6
status: completed
depends_on: P6.0-T4, P6.0-T5
risk: state_machine, concurrency, security
autonomy: full_sdd_with_checkpoint
agent_fit: architect, reviewer, validator
allowed_agents: architect, reviewer, validator
required_artifacts: artifacts/phase6.0-team-mode-policy.md
verification_availability: inspect:sdd status --branch master
```

- Define adaptive team-mode activation and inspect output (`auto`, `force`, `off`).
- Define TeamModePolicy, TeamSessionRecord, TeamMessageRecord, DelegationWavePolicy, FileOwnershipPolicy, review-lite, hyperplan/adversarial review wave, and security-research wave semantics.
- Chief agent can coordinate but cannot bypass lifecycle risk gate, required artifacts, verify/doctor, sync-back policy, or completion truth.
- Team member outputs must become evidence/provenance, not automatic task completion.
- Evidence: `sdd team-mode inspect` reports disabled no-task default; task routing defaults to adaptive `auto`, `--team-mode` maps to bounded `force`, `--no-team-mode` maps to `off`, and router output preserves SDD risk/artifact gates and evidence/provenance semantics.

### P6.0-T7: Integrate router preflight into task execution

```sdd-task
id: P6.0-T7
status: completed
depends_on: P6.0-T4, P6.0-T5, P6.0-T6
risk: state_machine, concurrency
autonomy: full_sdd_with_checkpoint
agent_fit: implementer, reviewer, validator
allowed_agents: implementer, reviewer, validator
required_artifacts: artifacts/phase6.0-do-preflight-review.md, artifacts/phase6.0-do-preflight-validation.md
verification_availability: inspect:sdd status --branch master
```

- Make `sdd do task` consult AgentRouterDecision before execution.
- Preserve lifecycle hard gates, tool permission, external pack quarantine status, adaptive team-mode activation/mode, and required artifacts.
- Block unsafe direct execution when risk/autonomy/tool/team-mode requires checkpoint.
- Evidence: `sdd do task` now writes an `agent_router_preflight` event, blocks router/tool-permission/task gaps before host execution, supports adaptive team-mode by default plus `--team-mode`/`--no-team-mode` overrides, and is covered by CLI/core tests plus `npm test`.

### P6.0-T8: Persist agent and team execution records

```sdd-task
id: P6.0-T8
status: completed
depends_on: P6.0-T7
risk: data_consistency
autonomy: compact_boundary_only
agent_fit: implementer, reviewer, validator
allowed_agents: implementer, reviewer, validator
required_artifacts: artifacts/phase6.0-agent-team-execution-record.md
verification_availability: inspect:sdd run inspect <run_id>
```

- Write agent records under `.sdd/runs/<run_id>/agent-executions/<execution_id>.json`.
- Write team records under `.sdd/runs/<run_id>/team-sessions/<team_id>.json` when team-mode is used.
- Include task id, profile, category, host, host session/task id, model_policy, tool permission, capabilities used, source attribution, status, artifacts, and risk/autonomy decision reference.
- Include TeamMessageRecord and ExecutionTrajectory references where applicable.
- Evidence: runtime creates `.sdd/runs/<run_id>/agent-executions/` and `.sdd/runs/<run_id>/team-sessions/`; persisted records include route snapshots, model policy, tool permission, capabilities, source attribution, artifacts, statuses, and TeamMessageRecord entries.

### P6.0-T9: Bridge evidence ingestion and doctor/status visibility

```sdd-task
id: P6.0-T9
status: completed
depends_on: P6.0-T8
risk: api_schema
autonomy: compact_boundary_only
agent_fit: implementer, reviewer, validator
allowed_agents: implementer, reviewer, validator
required_artifacts: artifacts/phase6.0-evidence-ingestion-validation.md
verification_availability: inspect:sdd doctor --latest-only
```

- Convert host output into `sdd-result-v1` artifacts where appropriate.
- Convert team-mode outputs into review/security/validation artifacts and source-attributed evidence summaries.
- Make verify/doctor/status show agent execution provenance, team session provenance, missing capability gaps, failed quarantine gaps, missing evidence gaps, and blocked tool permission reasons.
- Ensure records become Phase 7 graph inputs.
- Evidence: `run inspect`, `status` latest_run_evidence, `TaskRunEvidenceContract`, and `doctor --latest-only` now include or validate agent execution records, team sessions, router preflight, artifact ingestion, and record shape consistency.

### P6.0-T10: Validate runtime harness smoke scenarios

```sdd-task
id: P6.0-T10
status: completed
depends_on: P6.0-T9
risk: ci_build
autonomy: compact_boundary_only
agent_fit: validator, reviewer
allowed_agents: validator, reviewer
required_artifacts: artifacts/phase6.0-runtime-harness-smoke.md
verification_availability: inspect:sdd status --branch master
```

- Smoke `sdd tasks route <task_id>` on compact, full-checkpoint, external-unknown, security and adaptive team-mode off/review-lite/hyperplan/security-research cases.
- Smoke external source inspect on at least one safe source and one quarantined source.
- Smoke team-mode inspect plus route/do examples for default `auto`, forced `--team-mode`, and disabled `--no-team-mode` paths without executing destructive actions.
- Smoke doctor/status visibility for missing capability, missing evidence, failed quarantine and route health.
- Evidence: validation passed with `npm test` (127/127), `npm run build`, `npm run sdd -- agent-runtime validate`, `npm run sdd -- tasks route ONBOARDING-1 --branch master`, and `npm run sdd -- status --branch master`; CLI tests cover default adaptive routing, `sdd do task ONBOARDING-1 --team-mode`, `--no-team-mode`, plus `run inspect`/`status` evidence visibility.
