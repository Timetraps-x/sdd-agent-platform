# Phase 8 Risk Kernel Review

## Scope

PHASE8-3 adds a deterministic lifecycle risk decision kernel. It consumes Phase 8 coding risk signals and optional coding fact request state, then produces `LifecycleRiskDecision` for comparison/projection use. It does not enforce new sync-back, ship, doctor, status, or `/sdd:test` gates yet.

## Rule priority

The implemented rule priority is:

```text
blocked > research / human-required > full > compact > direct
```

- Unknown intent or acceptance, or any blocked signal, produces `profile=blocked` and `approvalPolicy=blocked`.
- Low-confidence external impact or unknown validation for source/runtime impact produces `profile=research`.
- Source, runtime-state, security, or high-risk signals produce `profile=full`.
- Context, performance, evidence, or medium-risk signals produce `profile=compact`.
- Low-risk known work produces `profile=direct`.

## Output review

- Required stages, skipped stages, blocked stages, required evidence, required reviews, approval policy, checkpoint requirement, reasons, policy version, input hash, and confidence are populated deterministically.
- Security and high external risks require human checkpoint without introducing agent/team/subagent selection.
- Source/runtime/security/evidence signals map to review requirements.
- Decision projections use Phase 8 envelope helpers and the existing Runtime Store projections table.

## Boundary confirmation

- The kernel is exported through `@sdd-agent-platform/core/risk` only.
- No command behavior changed in this task.
- Legacy adapters can feed the kernel, but legacy runtime gates were not replaced yet.
- The lifecycle risk decision contains lifecycle policy fields only and no agent, team, subagent, or owner fields.
