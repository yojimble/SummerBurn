import { useState } from 'react';
import { finalizeEvent } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAnonIdentity } from '@/hooks/useAnonIdentity';
import { toast } from '@/hooks/useToast';
import { SWAP_STATUS_EVENT_ID, REACTION_CD_RECEIVED, ORGANIZER_PUBKEY } from '@/lib/summerBurn';
import { hexToBytes } from '@/lib/utils';

const reactionTags = [
  ['e', SWAP_STATUS_EVENT_ID],
  ['p', ORGANIZER_PUBKEY],
  ['k', '1'],
];

export function CDReceivedButton() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { anonNsecHex, anonPubkey } = useAnonIdentity();
  const queryClient = useQueryClient();
  const [isPosting, setIsPosting] = useState(false);

  const { data: reaction, isLoading } = useQuery({
    queryKey: ['summerburn', 'cd-received', anonPubkey ?? ''],
    queryFn: async (c) => {
      if (!anonPubkey) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [7], authors: [anonPubkey], '#e': [SWAP_STATUS_EVENT_ID] }],
        { signal },
      );
      return events.find((e) => e.content === REACTION_CD_RECEIVED) ?? null;
    },
    enabled: !!anonPubkey,
  });

  if (!user) return null;

  if (!anonPubkey) {
    return (
      <p className="text-sm text-amber-600">Generate your anon identity above before marking CDs as received.</p>
    );
  }

  if (isLoading) return null;

  if (reaction) {
    const date = new Date(reaction.created_at * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return (
      <div className="flex items-center gap-3">
        <span className="text-2xl">📀</span>
        <div>
          <p className="font-semibold text-green-700 dark:text-green-400">CDs received!</p>
          <p className="text-xs text-muted-foreground">Confirmed {date} · anonymously</p>
        </div>
      </div>
    );
  }

  const handleClick = async () => {
    if (!anonNsecHex) { toast({ title: 'Generate your anon identity first.' }); return; }
    setIsPosting(true);
    try {
      const event = finalizeEvent(
        { kind: 7, content: REACTION_CD_RECEIVED, tags: reactionTags, created_at: Math.floor(Date.now() / 1000) },
        hexToBytes(anonNsecHex),
      );
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-received'] });
      toast({ title: '📀 CDs received — let your sender know!', description: 'Enjoy the music!' });
    } catch {
      toast({ title: 'Failed', description: 'Please try again.' });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
      disabled={isPosting}
      onClick={handleClick}
    >
      {isPosting ? 'Confirming…' : '📀 CDs received — let your sender know!'}
    </Button>
  );
}
