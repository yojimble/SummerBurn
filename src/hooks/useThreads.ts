import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { HASHTAG } from '@/lib/summerBurn';

// Fetches root-level forum threads: kind 1 with the hashtag and no `e` tag (not a reply).
export function useThreads() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'threads'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [1], '#t': [HASHTAG], limit: 200 }],
        { signal },
      );
      // Root posts have no `e` tag
      return events
        .filter(e => !e.tags.some(t => t[0] === 'e'))
        .sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}
