import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { KIND_CD_LISTING, CD_LISTING_D_TAG } from '@/lib/summerBurn';
import { useMuteList } from './useMuteList.ts';
import type { NostrEvent } from '@nostrify/nostrify';

const KIND_COMMENT = 1111;

export function cdListingAddress(pubkey: string) {
  return `${KIND_CD_LISTING}:${pubkey}:${CD_LISTING_D_TAG}`;
}

export { KIND_COMMENT };

export function useCDComments(sellerPubkey: string | undefined) {
  const { nostr } = useNostr();
  const muted = useMuteList();

  return useQuery({
    queryKey: ['summerburn', 'cd-comments', sellerPubkey ?? ''],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [KIND_COMMENT], '#A': [cdListingAddress(sellerPubkey!)] }],
        { signal },
      );
      return events
        .filter((e: NostrEvent) => !muted.has(e.pubkey))
        .sort((a: NostrEvent, b: NostrEvent) => a.created_at - b.created_at);
    },
    enabled: !!sellerPubkey,
    staleTime: 30000,
  });
}
