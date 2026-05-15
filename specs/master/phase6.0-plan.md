# Phase 6.0 Plan: Agent / Skill / Team Runtime Harness

## Metadata

- spec_id: `phase6.0-agent-skill-team-runtime-harness`
- plan_id: `phase6.0-agent-skill-team-runtime-harness-plan`
- status: `planned`

## 1. Design Direction

Build a contract-first runtime layer that lets SDD choose, constrain and audit host-provided agents, skills, tools and optional team-mode execution. Phase 6 should not duplicate Claude Code/OpenCode/Cline/Roo/Oh My mechanics and should not become a large prompt pack. It should define the SDD-facing contracts, router decisions, team-mode boundaries, tool permission records, evidence records and validation gates that make those mechanics safe, explainable and reusable.

The restructured direction is:

```text
external repos are material libraries and mechanism references
host runtimes execute
SDD contracts decide, constrain, record and verify
```

## 2. Contract Set

| Contract | Purpose | Primary Inputs | Primary Outputs |
|---|---|---|---|
| AgentProfileContract | Defines stable SDD roles and execution boundaries. | stage, risk, autonomy, required artifacts, tool scope | planner/architect/implementer/reviewer/validator/researcher/orchestrator/security/domain_expert profiles |
| SkillCapabilityContract | Catalogs reusable skill/tool/MCP/domain capabilities and provenance. | host/project/user/open-source discovered skills/tools/MCPs | capability id, domain, source, allowed stages, risk ceiling, evidence type |
| CapabilitySourceCatalog | Records source repositories/tools and reuse classification. | research findings, local inventory, host capabilities | reuse_direct/adapt_via_host_adapter/borrow_mechanism/avoid decisions |
| ExternalAgentPackImportPolicy | Prevents unsafe prompt-pack imports. | external repo, license, agent files, scan results | quarantine status, mapping result, import denial/approval reason |
| ToolPermissionSpec | Defines host-neutral permission constraints. | profile, task risk, file scope, tool groups, host permission | allowed/denied tools, approval policy, runtime validation requirement |
| HostAdapterContract | Abstracts host execution without binding core to one runtime. | profile, prompt projection, task, run, capability request, tool permission | host session/task id, status, output, artifacts, tool call summary |
| AgentRouterContract | Converts SDD task metadata into execution decisions. | task metadata, lifecycle decision, capabilities, external pack status, team activation | category, recommended profile, allowed profiles, required capabilities, blocked reason, autonomy ceiling, team-mode policy |
| ModelPolicyContract | Abstracts host model/category/fallback choices. | profile/category/risk/config | model policy id, fallback policy, host-specific projection |
| TeamModePolicy | Governs adaptive chief-agent/specialist-team selection. | task risk, activation, router decision, required artifacts | enabled/disabled, activation, selected mode, cost class, reason, chief profile, member profiles, team wave plan, blocked reason |
| DelegationWavePolicy | Controls parallel child work. | task graph, dependency, team policy, file ownership, risk compatibility | wave id, child tasks, member assignments, artifact isolation, merge gate |
| FileOwnershipPolicy | Prevents parallel edit conflicts. | child tasks, files touched/intended, risk category | owner assignment, shared file lead, conflict block |
| AgentExecutionRecord | Captures actual agent/skill execution provenance. | host adapter result | execution id, profile, host, session id, model policy, capabilities used, artifacts, status |
| TeamSessionRecord | Captures team-mode execution provenance. | team create result, members, waves | team id, chief, members, host layout/session refs, status, artifacts |
| TeamMessageRecord | Captures structured member communication. | team messages, child task updates | sender, receiver, task ref, artifact refs, blocker/evidence summary |
| ExecutionTrajectory | Records implementation/retry/validation path. | agent steps, command evidence, failures, retries | timeline, blocked state, retry reason, submit/finalize event |
| EvidenceIngestionContract | Converts host output into SDD evidence. | execution/team records, host output, artifacts | `sdd-result-v1`, implementation/review/validation/security artifacts |
| SkillReusePolicy | Prevents reinventing existing wheels. | capability catalog, gap analysis | reuse decision, build exception reason, source attribution |

## 3. Router Semantics

```text
task metadata
  + lifecycle risk gate
  + required artifacts
  + available host capabilities
  + capability source catalog
  + external pack quarantine status
  + tool permission constraints
  + team_mode activation (`auto` / `force` / `off`)
  + project agent/skill config
  -> AgentRouterDecision
```

Router output must include:

- selected category
- recommended profile
- allowed profiles
- rejected profiles and reasons
- required skills/capabilities
- source capability and reuse decision
- tool permission summary
- model_policy abstraction
- team_mode activation, selected mode, cost class, reason and wave recommendation when applicable
- autonomy ceiling
- required artifacts
- blocked reason when risk gate forbids execution
- next action

## 4. External Material Strategy

| Source | Use as | Reuse decision | Build only if |
|---|---|---|---|
| Claude Code subagents/skills/commands/MCP/hooks | Native host execution capability | reuse_direct | SDD needs host-neutral record, router or evidence bridge |
| Context7 / Playwright / ripgrep / glob / gh / WebFetch | Existing tool capability | reuse_direct | SDD needs provenance/evidence mapping |
| OpenCode / Oh My OpenAgent/OpenCode | Adapter and mechanism reference | borrow_mechanism | SDD needs host-neutral adapter projection |
| Oh My team-mode | Optional team execution pattern | borrow_mechanism | SDD needs TeamModePolicy/TeamSessionRecord, not tmux runtime |
| Roo/Cline | Tool permission and subagent envelope reference | borrow_mechanism | SDD needs host-neutral permission spec |
| cc-sdd | SDD-like dynamic dispatch/completion gate reference | borrow_mechanism | SDD needs task graph/risk/evidence integration |
| agency-agents | Domain expert material library | adapt_via_host_adapter after quarantine | Specific agent material passes license/security/mapping checks |
| wshobson / BuildWithClaude | Marketplace manifest and file ownership reference | borrow_mechanism | SDD needs capability manifest import |
| levnikolaevich Claude skills | Evidence lanes and quality gate reference | borrow_mechanism | SDD needs evidence contract mapping |
| Aider / SWE-agent | Coding harness guardrail reference | borrow_mechanism | SDD needs file admission/trajectory records |
| Continue / OpenHands / SuperClaude | Skill/profile projection reference | borrow_mechanism | SDD needs multi-host projection |
| CrewAI / AutoGen / LangGraph | Workflow/state/handoff/checkpoint concept reference | avoid as core runtime | Only as optional future adapter after Phase 6 contracts stabilize |

## 5. Anti Big-Prompt Strategy

External material is converted into metadata before runtime use:

```text
external agent file
  -> quarantine scan
  -> source/license attribution
  -> extract domain / when_to_use / guardrails / deliverables / evidence hints
  -> map to SDD capability/profile fields
  -> short host prompt projection at execution time
```

Forbidden:

- bulk copying external prompt libraries into core prompts
- using persona prompt as workflow state machine
- expressing risk/tool permission/completion truth only in natural language
- letting external orchestrator prompts replace SDD router/verify/doctor

Allowed:

- use minimal-change, evidence-first, reality-check, file-ownership, MCP-builder and domain expert patterns as structured capability metadata
- cite source repository and license
- generate short, task-scoped host instructions from SDD router decisions

## 6. Team-Mode Plan

Team-mode is not globally forced. Default command behavior uses adaptive `auto` activation: the router may keep low-risk tasks `off`, select `review-lite` for review/validation evidence, select `hyperplan` for high-risk non-security tasks, or select `security-research` for authorized security-sensitive tasks. `--team-mode` maps to `force` and still uses the lowest safe bounded mode; `--no-team-mode` maps to `off` for that route/run.

```yaml
team_mode:
  activation: auto
  modes:
    off: low-risk or explicitly disabled
    review-lite: review/validation evidence, max_members <= 2
    hyperplan: high-risk non-security plan attack, max_members <= 4
    security-research: authorized defensive security review, max_members <= 3
  force_flag: --team-mode
  off_flag: --no-team-mode
  require_artifacts: true
```

Execution shape:

```text
sdd tasks route <task_id>
  -> decide team_mode activation and selected mode (`off`, `review-lite`, `hyperplan`, `security-research`)
  -> create TeamSessionRecord when selected mode is enabled or a forced/blocked team path needs provenance
  -> create DelegationWavePolicy
  -> host adapter invokes team/chief/member capabilities
  -> write AgentExecutionRecord per member
  -> write TeamMessageRecord for structured communication
  -> ingest member outputs into review/security/validation artifacts
  -> verify/doctor decide canonical state
```

Hyperplan wave:

- Runs before implementation.
- Uses adversarial reviewers such as architect, reviewer, security, validator, researcher.
- Output is a plan-risk artifact, not code.
- Blocks implementation if hard gaps remain.

Security-research wave:

- Runs only in authorized defensive scope.
- Separates vulnerability hunters from PoC engineers conceptually, but does not allow destructive exploitation.
- Severity is calibrated by practical exploitability and evidence.
- Output is a security findings artifact and remediation recommendation.

## 7. Execution Flow

```text
sdd do task <task_id>
  -> parse task metadata
  -> evaluate lifecycle/risk gate
  -> resolve capability source catalog
  -> check external pack quarantine status
  -> route agent profile/category/team wave
  -> compute tool permission and model policy
  -> select reusable skills/capabilities
  -> invoke host adapter or block with reason
  -> write AgentExecutionRecord / TeamSessionRecord / TeamMessageRecord
  -> ingest evidence into SDD artifacts
  -> verify/doctor consume records
```

## 8. Safety Rules

- SDD lifecycle risk gate has final authority over autonomy.
- Router/team-mode cannot downgrade hard gates, tool permission, required stages or required artifacts.
- High-risk database/security/concurrency/API/schema tasks cannot be routed to direct execution without required checkpoint/artifacts.
- A host agent session, tmux pane, external prompt, MCP result or subagent summary is provenance, not canonical completion state.
- `sdd-result-v1` and run artifacts remain canonical evidence.
- Skill reuse decisions must cite source capability; custom build requires explicit gap reason.
- External agent packs are quarantined until license/source attribution, hidden Unicode, secret, dangerous command and SDD mapping checks pass.
- Security research must remain authorized, defensive, non-destructive and evidence-calibrated.

## 9. Implementation Order

1. Contract schemas and type model: AgentProfile, SkillCapability, CapabilitySource, ExternalAgentPackImport, ToolPermission, HostAdapter, Router, TeamMode, DelegationWave, ExecutionRecord, EvidenceIngestion.
2. Static capability catalog and external material policy from `artifacts/phase6.0-skill-reuse-catalog.md`.
3. External pack quarantine/inspect boundary before any import or routing.
4. Router inspect command before execution integration.
5. Tool permission and anti-big-prompt projection in router output.
6. Adaptive team-mode inspect/policy boundary before host execution.
7. `sdd do task` preflight router integration.
8. AgentExecutionRecord and TeamSessionRecord write path.
9. Evidence ingestion bridge for agent/team/tool/security/browser outputs.
10. Doctor/status visibility and smoke cases.

## 10. Phase 8 Handoff

Phase 8 code graph will consume Phase 6 records as graph inputs after Phase 7 core modularization stabilizes the core module boundary: AgentProfileContract, SkillCapabilityContract, CapabilitySourceCatalog, ExternalAgentPackImportPolicy, ToolPermissionSpec, HostAdapterContract, AgentRouterDecision, ModelPolicyContract, TeamModePolicy, DelegationWavePolicy, AgentExecutionRecord, TeamSessionRecord, TeamMessageRecord, ExecutionTrajectory, SkillReuseDecision and EvidenceIngestionRecord.
