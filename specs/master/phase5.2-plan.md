# Phase 5.2 Plan

## Metadata

- phase_id: `5.2`
- plan_id: `phase5.2-workflow-agent-registry-harness-plan`
- depends_on: `5.1`
- blocks: `5.3`

## Implementation Slices

### P1: WorkflowGateContract

- Extend workflow YAML schema with gate fields.
- Add workflow inspect/validate API in core.
- Render missing inputs, missing artifacts, gap closure and next action in CLI.

### P2: AgentRegistryContract

- Normalize agent metadata fields.
- Add read/write boundary, tool allowlist and autonomy ceiling.
- Expose agent registry to generated commands.

### P3: Slash command agent visibility

- Update `/sdd:spec`、`/sdd:plan`、`/sdd:tasks`、`/sdd:do` instructions.
- Make expected agents and evidence locations visible without claiming autonomous execution.

## Validation Strategy

- `npm test`
- `npm run build`
- workflow/agent inspect smoke
- generated entry output review

## Risks

- Agent visibility must not imply uncontrolled background execution.
- Workflow gate failures must point to next action rather than dumping internal state.
