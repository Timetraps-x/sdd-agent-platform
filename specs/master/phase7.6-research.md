# Phase 7.6 Research — Agent Capability Upgrade

## Result

Proceed with a deterministic agent capability catalog and routed material-pack metadata.

## Local evidence

- Phase 6 already has agent/skill/team runtime contracts, project-config capability sources, quarantine checks, team-mode policy, and CLI registry surfaces.
- Phase 7.4 added `verify.md` as the verification design boundary.
- Phase 7.5 added `/sdd:test` and command evidence collection, which gives the capability model a concrete validation-runner boundary.
- Existing user guidance requires spec norm alignment, uncertainty resolution, performance/token planning, context-pack boundary, and subagent boundary to become platform-supported capabilities rather than manual checklist burden.

## External reference synthesis

- Claude Code context-window/cost/statusline guidance reinforces keeping long-lived workflow state outside the prompt and surfacing compact runtime summaries.
- Claude Code subagent/skill patterns support role-specialized work, but workflow-affecting decisions still need explicit contracts and reviewable artifacts.
- Oh My OpenCode/OpenAgent-style team/material reuse is useful as a mechanism, but direct prompt-OS adoption would conflict with this platform's contract/state/artifact architecture.
- CrewAI/AutoGen-style role capability routing supports explicit agent roles, but uncontrolled multi-agent defaulting risks token cost and authority confusion.

## Decision

Phase 7.6 should add a typed built-in `AgentCapabilityCatalog` with:

- capability domains for norm discovery, uncertainty resolution, performance planning, verification design, evidence collection, sync-back risk review, release summary, and context curation;
- command-stage mappings that distinguish required and optional domains;
- explicit authority levels so advisory, gate-evidence, and validation-runner capabilities are not conflated;
- routed material packs with load policy and context budget metadata;
- registry/doctor/CLI visibility for capability source and mapping health.

## Rejected alternatives

- Do not inject all material libraries into every command context because it causes prompt bloat and hides selection rationale.
- Do not let capability confidence automatically make workflow decisions because workflow-affecting state remains owned by contract-backed commands.
- Do not merge tool permission, agent role, and workflow authority into one field because that makes safety boundaries ambiguous.

## Handoff

Implement a static deterministic catalog first, expose it through core registries, doctor checks, and CLI registry commands, then let Phase 7.7 consume the mapping for command-scoped team runtime.
