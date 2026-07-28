import { useQuery } from '@tanstack/react-query';
import { unwrapEvent } from 'nostr-tools/nip59';
import { SimplePool } from 'nostr-tools/pool';
import { hexToBytes } from '@/lib/utils';
import { DM_RELAYS } from '@/lib/summerBurn';

// Queries gift-wrapped DMs (kind 1059) the user sent to themselves as a copy
// when dispatching their address, so "already sent" survives page reloads
// instead of relying on in-memory state.
export function useSentAddresses(
  anonPubkey: string | null,
  anonNsecHex: string | null,
) {
  return useQuery({
    queryKey: ['summerburn', 'sent-addresses', anonPubkey ?? ''],
    queryFn: async () => {
      if (!anonPubkey || !anonNsecHex) return new Set<string>();

      const pool = new SimplePool();
      const wraps = await pool.querySync(
        DM_RELAYS,
        { kinds: [1059], '#p': [anonPubkey], limit: 50 },
        { maxWait: 8000 },
      );
      pool.close(DM_RELAYS);

      const privkeyBytes = hexToBytes(anonNsecHex);
      const result = new Set<string>();

      for (const wrap of wraps) {
        try {
          const rumor = unwrapEvent(wrap, privkeyBytes);
          if (rumor.kind !== 14) continue;
          if (rumor.pubkey !== anonPubkey) continue;
          const recipient = rumor.tags.find((t) => t[0] === 'p')?.[1];
          if (recipient) result.add(recipient);
        } catch {
          // not for us or malformed
        }
      }

      return result;
    },
    enabled: !!anonPubkey && !!anonNsecHex,
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
