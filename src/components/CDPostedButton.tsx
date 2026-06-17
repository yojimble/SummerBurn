import { useState } from 'react';
import { finalizeEvent } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAnonIdentity } from '@/hooks/useAnonIdentity';
import { toast } from '@/hooks/useToast';
import { SWAP_STATUS_EVENT_ID, REACTION_CD_POSTED, ORGANIZER_PUBKEY, HASHTAG } from '@/lib/summerBurn';
import { hexToBytes } from '@/lib/utils';

const reactionTags = [
  ['e', SWAP_STATUS_EVENT_ID],
  ['p', ORGANIZER_PUBKEY],
  ['k', '1'],
];

const DEFAULT_NOTE = `📬 CDs posted! Three mixes winging their way to three lucky Burners. Now the wait begins... 🔥 #${HASHTAG}`;

export function CDPostedButton() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publish } = useNostrPublish();
  const { anonNsecHex, anonPubkey } = useAnonIdentity();
  const queryClient = useQueryClient();
  const [isPosting, setIsPosting] = useState(false);
  const [shareToNostr, setShareToNostr] = useState(false);
  const [noteText, setNoteText] = useState(DEFAULT_NOTE);

  const { data: reaction, isLoading } = useQuery({
    queryKey: ['summerburn', 'cd-posted', anonPubkey ?? ''],
    queryFn: async (c) => {
      if (!anonPubkey) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [7], authors: [anonPubkey], '#e': [SWAP_STATUS_EVENT_ID] }],
        { signal },
      );
      return events.find((e) => e.content === REACTION_CD_POSTED) ?? null;
    },
    enabled: !!anonPubkey,
  });

  if (!user) return null;

  if (!anonPubkey) {
    return (
      <p className="text-sm text-amber-600">Generate your anon identity above before marking CDs as posted.</p>
    );
  }

  if (isLoading) return null;

  if (reaction) {
    const date = new Date(reaction.created_at * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return (
      <div className="flex items-center gap-3">
        <span className="text-2xl">📬</span>
        <div>
          <p className="font-semibold text-green-700 dark:text-green-400">CDs posted!</p>
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
        { kind: 7, content: REACTION_CD_POSTED, tags: reactionTags, created_at: Math.floor(Date.now() / 1000) },
        hexToBytes(anonNsecHex),
      );
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });

      if (shareToNostr && noteText.trim()) {
        await publish({ kind: 1, content: noteText.trim(), tags: [['t', HASHTAG]] });
      }

      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-posted'] });
      toast({ title: '📬 CDs marked as posted!', description: 'Nicely done. Now sit back and wait for yours to arrive.' });
    } catch {
      toast({ title: 'Failed', description: 'Please try again.' });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
        disabled={isPosting}
        onClick={handleClick}
      >
        {isPosting ? 'Confirming…' : '📬 CDs posted — let your Burners know!'}
      </Button>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="share-nostr"
            checked={shareToNostr}
            onCheckedChange={(v) => setShareToNostr(!!v)}
            disabled={isPosting}
          />
          <Label htmlFor="share-nostr" className="text-sm cursor-pointer">Also share as a Nostr note</Label>
        </div>
        {shareToNostr && (
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="text-sm"
            disabled={isPosting}
          />
        )}
      </div>
    </div>
  );
}
