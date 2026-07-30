import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { SWAP_STATUS_EVENT_ID, REACTION_CD_POSTED, reactionCoversRecipient } from '@/lib/summerBurn';

export function useMyPostedStatus(recipientAnonPubkeys: string[], anonPubkey: string | null | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'cd-posted', anonPubkey ?? '', ...recipientAnonPubkeys],
    queryFn: async (c) => {
      if (!anonPubkey) return new Set<string>();
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [7], authors: [anonPubkey], '#e': [SWAP_STATUS_EVENT_ID] }],
        { signal },
      );
      const posted = events.filter((e) => e.content === REACTION_CD_POSTED);
      return new Set(recipientAnonPubkeys.filter((r) => posted.some((e) => reactionCoversRecipient(e.tags, r))));
    },
    enabled: !!anonPubkey && recipientAnonPubkeys.length > 0,
  });
}
