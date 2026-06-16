import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { HASHTAG } from '@/lib/summerBurn';

export function useGallery() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'gallery'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [20], '#t': [HASHTAG], limit: 100 }],
        { signal },
      );
      return events.sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}
