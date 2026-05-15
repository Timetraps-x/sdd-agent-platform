import type { RuntimeRegistryEntrySource } from '@sdd-agent-platform/core/router';

export function renderRegistryOriginCounts(sources: RuntimeRegistryEntrySource[] | undefined): string {
  if (!sources || sources.length === 0) {
    return 'none';
  }
  const counts = new Map<string, number>();
  for (const source of sources) {
    counts.set(source.origin, (counts.get(source.origin) ?? 0) + 1);
  }
  return [...counts.entries()].map(([origin, count]) => `${origin}:${count}`).join(',');
}

export function idsByOrigin(sources: RuntimeRegistryEntrySource[] | undefined, kind: RuntimeRegistryEntrySource['kind'], origin: RuntimeRegistryEntrySource['origin']): string {
  const ids = sources?.filter((source) => source.kind === kind && source.origin === origin).map((source) => source.id) ?? [];
  return ids.join(',') || 'none';
}
