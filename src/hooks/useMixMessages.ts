import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ORGANIZER_PUBKEY } from '@/lib/summerBurn';

export interface MixMessage {
  id: string;
  content: string;
  created_at: number;
}

export function useMixMessages() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery<MixMessage[]>({
    queryKey: ['summerburn', 'mix-inbox'],
    queryFn: async (c) => {
      if (!user?.signer?.nip44) throw new Error('NIP-44 required');
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      const wraps = await nostr.query([{ kinds: [1059], '#p': [ORGANIZER_PUBKEY], limit: 500 }], { signal });

      const results: MixMessage[] = [];
      for (const wrap of wraps) {
        try {
          const sealJson = await user.signer.nip44.decrypt(wrap.pubkey, wrap.content);
          const seal = JSON.parse(sealJson);
          const rumorJson = await user.signer.nip44.decrypt(seal.pubkey, seal.content);
          const rumor = JSON.parse(rumorJson);
          if (rumor.kind === 14 && typeof rumor.content === 'string') {
            results.push({ id: wrap.id, content: rumor.content, created_at: rumor.created_at });
          }
        } catch (err) {
          console.error('useMixMessages: failed to decrypt gift wrap', wrap.id, err);
        }
      }

      return results.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user?.signer?.nip44,
    staleTime: 30000,
  });
}
