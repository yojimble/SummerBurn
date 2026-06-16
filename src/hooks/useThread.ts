import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

// Fetches a single thread: the root post + all its replies.
export function useThread(rootId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'thread', rootId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const [rootEvents, replyEvents] = await Promise.all([
        nostr.query([{ kinds: [1], ids: [rootId], limit: 1 }], { signal }),
        nostr.query([{ kinds: [1], '#e': [rootId], limit: 500 }], { signal }),
      ]);
      const root = rootEvents[0] ?? null;
      const replies = replyEvents.sort((a, b) => a.created_at - b.created_at);
      return { root, replies };
    },
    staleTime: 15000,
    refetchInterval: 15000,
    enabled: !!rootId,
  });
}
