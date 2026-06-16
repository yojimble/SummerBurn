import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { HASHTAG, FORUM_TAG, LEGACY_FORUM_THREAD_IDS } from '@/lib/summerBurn';

export function useFeed() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'feed'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [1], '#t': [HASHTAG], limit: 100 }],
        { signal },
      );
      // Exclude forum replies (carry an `e` tag pointing to their thread
      // root), forum threads (carry the dedicated FORUM_TAG marker), and
      // legacy forum threads posted before that marker existed.
      const rootPosts = events.filter((event) =>
        !event.tags.some(([name, value]) => name === 'e' || (name === 't' && value === FORUM_TAG))
        && !LEGACY_FORUM_THREAD_IDS.includes(event.id),
      );
      return rootPosts.sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}
