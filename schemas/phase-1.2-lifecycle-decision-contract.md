# Phase 1.2 Lifecycle Decision Contract

## Contract

- contract id: `phase-1.2-lifecycle-decision-contract`
- canonical model: `docs/architecture/lifecycle-decision-model.md`
- storage: `state.json.lifecycleDecision` and `lifecycle_decision_recorded` event
- owner: core lifecycle decision contract
- writer in Phase 1.2: runtime placeholder record
- writer in Phase 1.7+: command gate/core decision evaluator
- readers: CLI status, doctor, command gate, future graph

## Required fields

```yaml
lifecycle_decision:
  contract: phase-1.2-lifecycle-decision-contract
  model_version: phase1.0-final
  input_summary: {}
  decision:
    profile: direct | compact | full | research | null
    confidence: high | medium | low | null
    hard_gate_hits: []
    required_stages: []
    skipped_stages: []
    human_checkpoint_required: false
  reasons: []
  escalation_triggers: []
  downgrade_reason: null
  audit:
    decided_at: ISO-8601 | null
    decided_by: command | runtime | user_override | null
    policy_version: phase1.0-final
    source_artifacts:
      - docs/architecture/lifecycle-decision-model.md
```

Phase 1.2 records this shape only. It must not reimplement hard gate evaluation or profile routing before Phase 1.7.
