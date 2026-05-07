# Phase 4.1 Plan

## Approach

Update only local package metadata, then validate the repository still builds and tests.

## Steps

1. Confirm package identity decision from Phase 4.0.
2. Edit `package.json` metadata.
3. Review `files` and runtime asset needs.
4. Run local validation.
5. Record results in `phase4.1-validation.md`.

## Validation

```bash
npm run typecheck
npm test
npm run build
```

## Risks

- Removing `private: true` before the publish decision could make accidental publish easier.
- Missing runtime assets in `files` may only show up in Phase 4.2 pack smoke.