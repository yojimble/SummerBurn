import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ORGANIZER_PUBKEY } from '@/lib/summerBurn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MixMessage {
  id: string;
  content: string;
  created_at: number;
}

export function MixInbox() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  const { data: messages, isLoading } = useQuery<MixMessage[]>({
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
          console.error('MixInbox: failed to decrypt gift wrap', wrap.id, err);
        }
      }

      return results.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user?.signer?.nip44,
    staleTime: 30000,
  });

  const adds = messages?.filter(m => m.content.startsWith('ADD ')) ?? [];
  const removes = messages?.filter(m => m.content.startsWith('REMOVE ')) ?? [];
  const unrecognized = messages?.filter(m => !m.content.startsWith('ADD ') && !m.content.startsWith('REMOVE ')) ?? [];

  const extractNpub = (content: string) => content.match(/npub1\S+/)?.[0];

  // Any REMOVE for an npub takes it out of the mix, regardless of ADD/REMOVE order.
  const addedNpubs = new Set(adds.map(m => extractNpub(m.content)).filter((n): n is string => !!n));
  const removedNpubs = new Set(removes.map(m => extractNpub(m.content)).filter((n): n is string => !!n));
  const inMix = [...addedNpubs].filter(npub => !removedNpubs.has(npub)).sort();

  return (
    <>
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Currently In Mix ({inMix.length})</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {!isLoading && inMix.length === 0 && (
          <p className="text-sm text-muted-foreground">No one is currently in the mix.</p>
        )}
        {inMix.map(npub => (
          <p key={npub} className="font-mono text-xs break-all bg-muted p-1.5 rounded text-green-600">{npub}</p>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Mix Inbox</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Decrypting messages…</p>}
        {!isLoading && messages?.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
        {adds.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-600">ADD ({adds.length})</p>
            {adds.map(m => (
              <p key={m.id} className="font-mono text-xs break-all bg-muted p-1.5 rounded">{m.content}</p>
            ))}
          </div>
        )}
        {removes.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-red-500">REMOVE ({removes.length})</p>
            {removes.map(m => (
              <p key={m.id} className="font-mono text-xs break-all bg-muted p-1.5 rounded">{m.content}</p>
            ))}
          </div>
        )}
        {unrecognized.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-yellow-600">Unrecognized ({unrecognized.length})</p>
            {unrecognized.map(m => (
              <p key={m.id} className="font-mono text-xs break-all bg-muted p-1.5 rounded">{m.content}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
