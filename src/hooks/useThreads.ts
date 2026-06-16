import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrFilter } from '@nostrify/nostrify';
import { FORUM_TAG, LEGACY_FORUM_THREAD_IDS } from '@/lib/summerBurn';

// Fetches root-level forum threads: kind 1 with the forum marker tag and no `e` tag (not a reply),
// plus any legacy threads posted before the forum marker tag existed.
export function useThreads() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'threads'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const filters: NostrFilter[] = [{ kinds: [1], '#t': [FORUM_TAG], limit: 200 }];
      if (LEGACY_FORUM_THREAD_IDS.length > 0) {
        filters.push({ kinds: [1], ids: LEGACY_FORUM_THREAD_IDS });
      }
      const events = await nostr.query(filters, { signal });
      // Root posts have no `e` tag
      return events
        .filter(e => !e.tags.some(t => t[0] === 'e'))
        .sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 30000,
    refetchInterval: 30000,
  });
}
