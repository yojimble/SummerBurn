import { useState } from 'react';
import { finalizeEvent } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAnonIdentity } from '@/hooks/useAnonIdentity';
import { toast } from '@/hooks/useToast';
import { SWAP_STATUS_EVENT_ID, REACTION_CD_POSTED, ORGANIZER_PUBKEY, DISPATCH_TAG, reactionCoversRecipient } from '@/lib/summerBurn';
import { hexToBytes } from '@/lib/utils';

interface CDPostedButtonProps {
  recipientAnonPubkey: string;
  label: string;
}

export function CDPostedButton({ recipientAnonPubkey, label }: CDPostedButtonProps) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { anonNsecHex, anonPubkey } = useAnonIdentity();
  const queryClient = useQueryClient();
  const [isPosting, setIsPosting] = useState(false);

  const { data: reaction, isLoading } = useQuery({
    queryKey: ['summerburn', 'cd-posted', anonPubkey ?? '', recipientAnonPubkey],
    queryFn: async (c) => {
      if (!anonPubkey) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [7], authors: [anonPubkey], '#e': [SWAP_STATUS_EVENT_ID] }],
        { signal },
      );
      return events.find((e) => e.content === REACTION_CD_POSTED && reactionCoversRecipient(e.tags, recipientAnonPubkey)) ?? null;
    },
    enabled: !!anonPubkey,
  });

  if (!user) return null;

  if (!anonPubkey) {
    return (
      <p className="text-xs text-amber-600">Generate your anon identity above before marking as sent.</p>
    );
  }

  if (isLoading) return null;

  if (reaction) {
    const date = new Date(reaction.created_at * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return (
      <p className="text-xs text-green-600 font-medium">
        📬 Marked as sent to {label} · {date}
      </p>
    );
  }

  const handleClick = async () => {
    if (!anonNsecHex) { toast({ title: 'Generate your anon identity first.' }); return; }
    setIsPosting(true);
    try {
      const event = finalizeEvent(
        {
          kind: 7,
          content: REACTION_CD_POSTED,
          tags: [
            ['e', SWAP_STATUS_EVENT_ID],
            ['k', '1'],
            [DISPATCH_TAG, recipientAnonPubkey],
            ['p', ORGANIZER_PUBKEY],
          ],
          created_at: Math.floor(Date.now() / 1000),
        },
        hexToBytes(anonNsecHex),
      );
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });

      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-posted'] });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'sender-status'] });
      toast({ title: `📬 Marked as sent to ${label}` });
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
      className="border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
      disabled={isPosting}
      onClick={handleClick}
    >
      {isPosting ? 'Confirming…' : '📬 Mark as sent'}
    </Button>
  );
}
