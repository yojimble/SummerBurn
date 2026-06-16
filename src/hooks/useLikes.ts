import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// NIP-25 reactions (kind 7) for a single event.
export function useLikes(eventId: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  const query = useQuery({
    queryKey: ['summerburn', 'likes', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [7], '#e': [eventId], limit: 500 }],
        { signal },
      );
      // One like per pubkey (keep latest)
      const byPubkey = new Map<string, number>();
      for (const event of events) {
        if (event.content === '-') continue; // dislike, don't count
        const existing = byPubkey.get(event.pubkey);
        if (!existing || event.created_at > existing) {
          byPubkey.set(event.pubkey, event.created_at);
        }
      }
      return { count: byPubkey.size, pubkeys: new Set(byPubkey.keys()) };
    },
    staleTime: 30000,
    refetchInterval: 30000,
    enabled: !!eventId,
  });

  const likedByMe = !!(user && query.data?.pubkeys.has(user.pubkey));

  return { ...query, likedByMe };
}
