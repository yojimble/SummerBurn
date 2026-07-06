import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useMuteList } from './useMuteList.ts';

// Fetches a single thread: the root post + all its replies.
export function useThread(rootId: string) {
  const { nostr } = useNostr();
  const muted = useMuteList();

  return useQuery({
    queryKey: ['summerburn', 'thread', rootId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const [rootEvents, replyEvents] = await Promise.all([
        nostr.query([{ kinds: [1], ids: [rootId], limit: 1 }], { signal }),
        nostr.query([{ kinds: [1], '#e': [rootId], limit: 500 }], { signal }),
      ]);
      const root = rootEvents[0] ?? null;
      if (root && muted.has(root.pubkey)) return { root: null, replies: [] };
      const replies = replyEvents
        .filter((e) => {
          if (muted.has(e.pubkey)) return false;
          const rootRefs = e.tags.filter(([n, id]) => n === 'e' && id === rootId);
          // Exclude quote-reposts: events where every reference to the root is marked 'mention'
          if (rootRefs.length > 0 && rootRefs.every(([,,,m]) => m === 'mention')) return false;
          return true;
        })
        .sort((a, b) => a.created_at - b.created_at);
      return { root, replies };
    },
    staleTime: 15000,
    refetchInterval: 15000,
    enabled: !!rootId,
  });
}
