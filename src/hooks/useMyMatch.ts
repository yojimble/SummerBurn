import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { unwrapEvent } from 'nostr-tools/nip59';
import { hexToBytes } from '@/lib/utils';
import { ORGANIZER_PUBKEY } from '@/lib/summerBurn';
import { useAnonIdentity } from './useAnonIdentity';

export interface MatchData {
  sendingTo: string[];    // anon pubkeys — recipients who will DM their address to you
  receivingFrom: string[]; // anon pubkeys of senders who will post you a CD
}

// Matches are delivered as gift-wrapped (NIP-17/NIP-59) DMs addressed to the
// user's current anon pubkey — not a custom event kind. Regenerating the anon
// identity naturally drops old matches, since they were addressed to the old
// anon pubkey and won't be found under the new one.
export function useMyMatch() {
  const { nostr } = useNostr();
  const { anonPubkey, anonNsecHex } = useAnonIdentity();

  return useQuery({
    queryKey: ['summerburn', 'match', anonPubkey ?? ''],
    queryFn: async (c) => {
      if (!anonPubkey || !anonNsecHex || !ORGANIZER_PUBKEY) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);

      const wraps = await nostr.query(
        [{ kinds: [1059], '#p': [anonPubkey], limit: 50 }],
        { signal },
      );

      const privkeyBytes = hexToBytes(anonNsecHex);
      let latest: MatchData | null = null;
      let latestCreatedAt = -1;

      for (const wrap of wraps) {
        try {
          const rumor = unwrapEvent(wrap, privkeyBytes);
          if (rumor.kind !== 14) continue;
          if (rumor.pubkey !== ORGANIZER_PUBKEY) continue;
          if (rumor.created_at <= latestCreatedAt) continue;
          const data = JSON.parse(rumor.content) as MatchData;
          if (!Array.isArray(data.sendingTo) || !Array.isArray(data.receivingFrom)) continue;
          latest = data;
          latestCreatedAt = rumor.created_at;
        } catch {
          // Not for us or malformed — skip
        }
      }

      return latest;
    },
    enabled: !!anonPubkey && !!anonNsecHex && !!ORGANIZER_PUBKEY,
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
