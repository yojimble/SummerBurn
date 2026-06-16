import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { HASHTAG, KIND_CD_LISTING } from '@/lib/summerBurn';

// Fetches all CD listings tagged for this event (active/for-sale and gallery-only),
// one per author (latest version wins).
export function useCDListings() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'cd-listings'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [KIND_CD_LISTING], '#t': [HASHTAG], limit: 200 }],
        { signal },
      );

      const byPubkey = new Map<string, typeof events[number]>();
      for (const event of events) {
        const existing = byPubkey.get(event.pubkey);
        if (!existing || event.created_at > existing.created_at) {
          byPubkey.set(event.pubkey, event);
        }
      }

      return [...byPubkey.values()].sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}
