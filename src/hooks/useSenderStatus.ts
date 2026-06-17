import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { SWAP_STATUS_EVENT_ID, REACTION_CD_POSTED } from '@/lib/summerBurn';

export function useSenderStatus(senderAnonPubkeys: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'sender-status', ...senderAnonPubkeys],
    queryFn: async (c) => {
      if (!senderAnonPubkeys.length) return new Set<string>();
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [7], authors: senderAnonPubkeys, '#e': [SWAP_STATUS_EVENT_ID] }],
        { signal },
      );
      return new Set(events.filter((e) => e.content === REACTION_CD_POSTED).map((e) => e.pubkey));
    },
    enabled: senderAnonPubkeys.length > 0,
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
