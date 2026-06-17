import { useState } from 'react';
import { finalizeEvent } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAnonIdentity } from '@/hooks/useAnonIdentity';
import { toast } from '@/hooks/useToast';
import { KIND_CD_RECEIVED } from '@/lib/summerBurn';
import { hexToBytes } from '@/lib/utils';

interface Props {
  senderAnonPubkey: string;
}

export function CDReceivedButton({ senderAnonPubkey }: Props) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { anonNsecHex, anonPubkey } = useAnonIdentity();
  const queryClient = useQueryClient();
  const [isPosting, setIsPosting] = useState(false);

  const { data: received, isLoading } = useQuery({
    queryKey: ['summerburn', 'cd-received', anonPubkey ?? '', senderAnonPubkey],
    queryFn: async (c) => {
      if (!anonPubkey) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const [event] = await nostr.query(
        [{ kinds: [KIND_CD_RECEIVED], authors: [anonPubkey], '#d': [senderAnonPubkey], limit: 1 }],
        { signal },
      );
      return event ?? null;
    },
    enabled: !!anonPubkey,
  });

  if (!user || !anonPubkey || isLoading) return null;

  if (received) {
    return <p className="text-xs text-green-600 font-medium">📀 CD received!</p>;
  }

  const handleClick = async () => {
    if (!anonNsecHex) { toast({ title: 'Generate your anon identity first.' }); return; }
    setIsPosting(true);
    try {
      const event = finalizeEvent(
        {
          kind: KIND_CD_RECEIVED,
          content: '',
          tags: [['d', senderAnonPubkey]],
          created_at: Math.floor(Date.now() / 1000),
        },
        hexToBytes(anonNsecHex),
      );
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-received', anonPubkey, senderAnonPubkey] });
      toast({ title: '📀 Marked as received!', description: 'Enjoy the music!' });
    } catch {
      toast({ title: 'Failed', description: 'Please try again.' });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-950 text-xs"
      disabled={isPosting}
      onClick={handleClick}
    >
      {isPosting ? 'Confirming…' : '📀 Mark as received'}
    </Button>
  );
}
