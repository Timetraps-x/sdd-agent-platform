# Phase 7.0 Tasks — Core Runtime Modularization

## Completed

- [x] Gate 0：package-local build、explicit core subpath exports、CLI package boundary regression。
- [x] Gate 1：doctor check-family split；`doctor.ts` reduced to orchestration and summary composition。
- [x] Gate 2：router/routing split；rules/profile/risk/projection extracted from route orchestration。
- [x] Gate 3：CLI registry command and renderer split behind stable façades。
- [x] Gate 4：doctor terminal renderer moved to CLI renderer ownership。
- [x] Gate 5：Phase 7 docs/status/architecture/README validation sync。

## Deferred to Phase 8 or later

- Code graph / SDD graph / run graph implementation。
- Broader renderer ownership cleanup beyond doctor, unless a later phase chooses a specific family.
- Additional runtime-analysis internal decomposition if it becomes necessary for Phase 8 graph ingestion.
