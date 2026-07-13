import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { NRelay1 } from '@nostrify/nostrify';
import { RSVP_D_TAG, CALENDAR_EVENT_COORDINATE } from '@/lib/summerBurn';

function getRSVPStatus(event: NostrEvent): string {
  return event.tags.find(([name]) => name === 'status')?.[1] ?? 'accepted';
}

// Wide-indexing relays checked in addition to the app's default relays.
// RSVPers whose signer only publishes to their own (possibly obscure)
// relays won't reach our default relay set, but aggregator relays like
// relay.nostr.band crawl and re-index events from across the network, so
// checking it too catches RSVPs that would otherwise go unseen.
const AGGREGATOR_RELAYS = ['wss://relay.nostr.band'];

export function useRSVPs() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'rsvps'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const filter = CALENDAR_EVENT_COORDINATE
        ? { kinds: [31925], '#a': [CALENDAR_EVENT_COORDINATE], limit: 1000 }
        : { kinds: [31925], '#d': [RSVP_D_TAG], limit: 1000 };

      const [poolEvents, ...aggregatorResults] = await Promise.all([
        nostr.query([filter], { signal }),
        ...AGGREGATOR_RELAYS.map(async (url) => {
          try {
            const relay = new NRelay1(url);
            const events = await relay.query([filter], { signal });
            relay.close();
            return events;
          } catch {
            return [];
          }
        }),
      ]);

      const events = [...poolEvents, ...aggregatorResults.flat()];

      // Group by pubkey, keep latest event per pubkey (replaceable event)
      const byPubkey = new Map<string, NostrEvent>();
      for (const event of events) {
        const existing = byPubkey.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          byPubkey.set(event.pubkey, event);
        }
      }

      const accepted = [...byPubkey.values()].filter(
        (e) => getRSVPStatus(e) === 'accepted',
      );

      return {
        events: accepted,
        pubkeys: new Set(accepted.map((e) => e.pubkey)),
        count: accepted.length,
      };
    },
    staleTime: Infinity,
  });
}
