import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { BLOCKED_PUBKEYS } from '@/lib/summerBurn';
import { useCurrentUser } from './useCurrentUser.ts';

/**
 * Returns the combined set of muted pubkeys: the hardcoded BLOCKED_PUBKEYS
 * plus the logged-in user's NIP-51 mute list (kind 10000), if any.
 */
export function useMuteList(): Set<string> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  const { data: muteListPubkeys = [] } = useQuery({
    queryKey: ['summerburn', 'mute-list', user?.pubkey ?? ''],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [10000], authors: [user!.pubkey], limit: 1 }],
        { signal },
      );
      const latest = events.sort((a, b) => b.created_at - a.created_at)[0];
      if (!latest) return [];
      return latest.tags.filter(([name]) => name === 'p').map(([, pubkey]) => pubkey);
    },
    enabled: !!user?.pubkey,
    staleTime: 60000,
    refetchInterval: 60000,
  });

  return new Set([...BLOCKED_PUBKEYS, ...muteListPubkeys]);
}
