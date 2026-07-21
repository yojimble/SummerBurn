import type { RelayMetadata } from '@/contexts/AppContext';

/**
 * App default relays. Used as the initial `relayMetadata` for new users and as
 * a fallback when the user has no NIP-65 relay list configured (e.g. during
 * nostrconnect handshakes before any user relays have been loaded).
 */
export const APP_RELAYS: RelayMetadata = {
  relays: [
    { url: 'wss://relay.primal.net/', read: true, write: true },
    { url: 'wss://relay.damus.io/', read: true, write: true },
    { url: 'wss://nos.lol/', read: true, write: true },
    { url: 'wss://nostr.mom/', read: true, write: true },
  ],
  updatedAt: 0,
};

// Merge a set of relays with the app's current defaults (by URL) instead of
// replacing them, so publishes/queries always reach the site's relays in
// addition to whatever else is in the list — even if the list being merged
// into was cached before APP_RELAYS last changed.
export function mergeWithAppRelays(relays: RelayMetadata['relays']): RelayMetadata['relays'] {
  const byUrl = new Map(relays.map((r) => [r.url, r]));
  for (const appRelay of APP_RELAYS.relays) {
    if (!byUrl.has(appRelay.url)) {
      byUrl.set(appRelay.url, appRelay);
    }
  }
  return [...byUrl.values()];
}
