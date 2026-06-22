import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { SWAP_STATUS_EVENT_ID, REACTION_CD_POSTED, HASHTAG, KIND_CD_LISTING, BLOCKED_PUBKEYS } from '@/lib/summerBurn';

export function useCDStats() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'cd-stats'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const [reactions, listings] = await Promise.all([
        nostr.query([{ kinds: [7], '#e': [SWAP_STATUS_EVENT_ID], limit: 2000 }], { signal }),
        nostr.query([{ kinds: [KIND_CD_LISTING], '#t': [HASHTAG], limit: 2000 }], { signal }),
      ]);
      const posted = new Set(reactions.filter((e) => !BLOCKED_PUBKEYS.has(e.pubkey) && e.content === REACTION_CD_POSTED).map((e) => e.pubkey)).size;
      const published = new Set(listings.filter((e) => !BLOCKED_PUBKEYS.has(e.pubkey)).map((e) => e.pubkey)).size;
      return { posted, published };
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
