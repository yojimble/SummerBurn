import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { KIND_MATCH, ORGANIZER_PUBKEY, RSVP_D_TAG } from '@/lib/summerBurn';
import { useCurrentUser } from './useCurrentUser';

export interface MatchData {
  sendingTo: string[];    // anon pubkeys — recipients who will DM their address to you
  receivingFrom: string[]; // real pubkeys of senders who will post you a CD
}

export function useMyMatch() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['summerburn', 'match', user?.pubkey ?? ''],
    queryFn: async (c) => {
      if (!user || !ORGANIZER_PUBKEY) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const [event] = await nostr.query(
        [{
          kinds: [KIND_MATCH],
          authors: [ORGANIZER_PUBKEY],
          '#d': [`${RSVP_D_TAG}:${user.pubkey}`],
          limit: 1,
        }],
        { signal },
      );

      if (!event) return null;
      if (!user.signer.nip44) return null;

      const decrypted = await user.signer.nip44.decrypt(ORGANIZER_PUBKEY, event.content);
      return JSON.parse(decrypted) as MatchData;
    },
    enabled: !!user && !!ORGANIZER_PUBKEY,
    staleTime: 5 * 60 * 1000,
  });
}
