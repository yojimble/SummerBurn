import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { SWAP_STATUS_EVENT_ID, REACTION_CD_POSTED, KIND_CD_RECEIVED } from '@/lib/summerBurn';

export function useCDStats() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'cd-stats'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const [postedReactions, receivedEvents] = await Promise.all([
        nostr.query([{ kinds: [7], '#e': [SWAP_STATUS_EVENT_ID], limit: 2000 }], { signal }),
        nostr.query([{ kinds: [KIND_CD_RECEIVED], limit: 2000 }], { signal }),
      ]);
      const posted = new Set(postedReactions.filter((e) => e.content === REACTION_CD_POSTED).map((e) => e.pubkey)).size;
      const received = new Set(receivedEvents.map((e) => e.pubkey)).size;
      return { posted, received };
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
