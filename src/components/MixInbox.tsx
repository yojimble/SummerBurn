import { useMixMessages } from '@/hooks/useMixMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MixInbox() {
  const { data: messages, isLoading } = useMixMessages();

  const adds = messages?.filter(m => m.content.startsWith('ADD ')) ?? [];
  const removes = messages?.filter(m => m.content.startsWith('REMOVE ')) ?? [];

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
      </CardContent>
    </Card>
    </>
  );
}
