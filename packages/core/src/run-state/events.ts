
import path from 'node:path';
import { EVENT_LOG_CONTRACT } from '../contracts.js';
import { getRunDir } from '../runtime-paths.js';

import { importLegacyRunEventsIfNeeded, readRuntimeRunEvents, recordRuntimeEvent } from '../storage/runtime-store.js';
import type { RuntimeEvent } from './model.js';

export async function appendEvent(projectRoot: string, runId: string, event: Omit<RuntimeEvent, 'contract' | 'time'>): Promise<RuntimeEvent> {
  const nextEvent: RuntimeEvent = {
    contract: EVENT_LOG_CONTRACT,
    time: new Date().toISOString(),
    ...event
  };
  await recordRuntimeEvent(projectRoot, nextEvent);
  return nextEvent;
}

export async function readRunEvents(projectRoot: string, runId: string): Promise<RuntimeEvent[]> {
  const storedEvents = await readRuntimeRunEvents(projectRoot, runId);
  if (storedEvents.length > 0) {
    return storedEvents;
  }
  const eventPath = path.join(getRunDir(projectRoot, runId), 'events.jsonl');
  await importLegacyRunEventsIfNeeded(projectRoot, runId, eventPath);
  return readRuntimeRunEvents(projectRoot, runId);
}
