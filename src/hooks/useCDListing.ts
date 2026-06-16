import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { KIND_CD_LISTING, CD_LISTING_D_TAG } from '@/lib/summerBurn';

// Fetches a single user's CD listing (active or inactive) by pubkey.
export function useCDListing(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'cd-listing', pubkey ?? ''],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [KIND_CD_LISTING], authors: [pubkey!], '#d': [CD_LISTING_D_TAG], limit: 1 }],
        { signal },
      );
      return events.sort((a, b) => b.created_at - a.created_at)[0] ?? null;
    },
    enabled: !!pubkey,
    staleTime: 30000,
  });
}
