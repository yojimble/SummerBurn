import { useQuery } from '@tanstack/react-query';
import { unwrapEvent } from 'nostr-tools/nip59';
import { SimplePool } from 'nostr-tools/pool';
import { hexToBytes } from '@/lib/utils';
import { DM_RELAYS } from '@/lib/summerBurn';

// Queries gift-wrapped DMs (kind 1059) sent to the user's anon pubkey.
// Unwraps each with the anon nsec to get the inner kind 14 rumor content.
export function useAddressDMs(
  senderAnonPubkeys: string[],
  anonPubkey: string | null,
  anonNsecHex: string | null,
) {
  return useQuery({
    queryKey: ['summerburn', 'address-dms', anonPubkey ?? '', senderAnonPubkeys.join(',')],
    queryFn: async () => {
      if (!anonPubkey || !anonNsecHex || !senderAnonPubkeys.length) return {};

      const pool = new SimplePool();
      const wraps = await pool.querySync(
        DM_RELAYS,
        { kinds: [1059], '#p': [anonPubkey], limit: 50 },
        { maxWait: 8000 },
      );
      pool.close(DM_RELAYS);

      const privkeyBytes = hexToBytes(anonNsecHex);
      const result: Record<string, string> = {};

      for (const wrap of wraps) {
        try {
          const rumor = unwrapEvent(wrap, privkeyBytes);
          if (rumor.kind !== 14) continue;
          const senderPubkey = rumor.pubkey;
          if (!senderAnonPubkeys.includes(senderPubkey)) continue;
          if (!result[senderPubkey] && rumor.content.trim()) {
            result[senderPubkey] = rumor.content.trim();
          }
        } catch {
          // not for us or malformed
        }
      }

      return result;
    },
    enabled: !!anonPubkey && !!anonNsecHex && senderAnonPubkeys.length > 0,
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
