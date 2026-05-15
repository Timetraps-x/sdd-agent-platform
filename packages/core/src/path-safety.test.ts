import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { readRunState } from './run-state/run-state.js';
import { parseSddBranch } from './sdd-docs/task-parser.js';
import { getArtifactPath } from './runtime-paths.js';

test('safe path segments reject dot-dot branch and run id while allowing dotted names', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sdd-safe-path-'));
  try {
    await assert.rejects(() => parseSddBranch(root, '..'), /branch cannot be \. or \.\./);
    await assert.rejects(() => readRunState(root, '..'), /runId cannot be \. or \.\./);
    assert.doesNotThrow(() => getArtifactPath(root, 'phase-1.5_run-1', 'evidence.md'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
