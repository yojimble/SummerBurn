import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Addressable events (kind 30000-39999) are replaceable per (kind, pubkey, d-tag):
 * republishing with the same d-tag is how authors edit them. Relays don't always
 * dedupe this for us, so when aggregating across many authors, keep only the
 * newest event per (kind, pubkey, d-tag) group.
 */
export function dedupeAddressable<T extends NostrEvent>(events: T[]): T[] {
  const latest = new Map<string, T>();
  for (const event of events) {
    const dTag = event.tags.find(([name]) => name === 'd')?.[1] ?? '';
    const key = `${event.kind}:${event.pubkey}:${dTag}`;
    const existing = latest.get(key);
    if (!existing || event.created_at > existing.created_at) {
      latest.set(key, event);
    }
  }
  return [...latest.values()];
}
