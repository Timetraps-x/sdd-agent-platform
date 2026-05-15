import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { EVENT_LOG_CONTRACT } from '../contracts.js';
import { getRunDir } from '../runtime-paths.js';
import { exists } from '../storage/json-io.js';
import { importLegacyRunEventsIfNeeded, readRuntimeRunEvents, recordRuntimeEvent } from '../storage/runtime-store.js';
import type { RuntimeEvent } from './model.js';

export async function appendEvent(projectRoot: string, runId: string, event: Omit<RuntimeEvent, 'contract' | 'time'>): Promise<RuntimeEvent> {
  const nextEvent: RuntimeEvent = {
    contract: EVENT_LOG_CONTRACT,
    time: new Date().toISOString(),
    ...event
  };
  const eventPath = path.join(getRunDir(projectRoot, runId), 'events.jsonl');
  await appendFile(eventPath, `${JSON.stringify(nextEvent)}\n`, 'utf8');
  await recordRuntimeEvent(projectRoot, nextEvent);
  return nextEvent;
}

export async function readRunEvents(projectRoot: string, runId: string): Promise<RuntimeEvent[]> {
  const eventPath = path.join(getRunDir(projectRoot, runId), 'events.jsonl');
  await importLegacyRunEventsIfNeeded(projectRoot, runId, eventPath);
  const storedEvents = await readRuntimeRunEvents(projectRoot, runId);
  if (storedEvents.length > 0 || !await exists(eventPath)) {
    return storedEvents;
  }
  const raw = await readFile(eventPath, 'utf8');
  return raw.split(/\r?\n/).filter((line) => line.trim().length > 0).map((line) => JSON.parse(line) as RuntimeEvent);
}
