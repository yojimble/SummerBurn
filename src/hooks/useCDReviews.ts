import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { KIND_CD_REVIEW, KIND_CD_LISTING, CD_LISTING_D_TAG } from '@/lib/summerBurn';
import { dedupeAddressable } from '@/lib/nostrUtils';

export interface CDReview {
  id: string;
  pubkey: string;
  created_at: number;
  stars: number;
  content: string;
}

function reviewDTag(sellerPubkey: string) {
  return `a:${KIND_CD_LISTING}:${sellerPubkey}:${CD_LISTING_D_TAG}`;
}

export function useCDReviews(sellerPubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'cd-reviews', sellerPubkey ?? ''],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [KIND_CD_REVIEW], '#d': [reviewDTag(sellerPubkey!)] }],
        { signal },
      );
      const reviews: CDReview[] = dedupeAddressable(events)
        .map((e) => {
          const scoreStr = e.tags.find(([n, , label]) => n === 'rating' && label === 'thumb')?.[1];
          const score = scoreStr ? parseFloat(scoreStr) : null;
          if (score === null || score < 0 || score > 1) return null;
          const stars = Math.round(score * 4) + 1; // 0→1, 0.25→2, 0.5→3, 0.75→4, 1→5
          return { id: e.id, pubkey: e.pubkey, created_at: e.created_at, stars, content: e.content };
        })
        .filter((r): r is CDReview => r !== null);
      return reviews;
    },
    enabled: !!sellerPubkey,
    staleTime: 60000,
  });
}

export { reviewDTag };
