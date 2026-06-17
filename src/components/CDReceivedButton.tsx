import { useState } from 'react';
import { finalizeEvent } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAnonIdentity } from '@/hooks/useAnonIdentity';
import { toast } from '@/hooks/useToast';
import { SWAP_STATUS_EVENT_ID, REACTION_CD_RECEIVED, ORGANIZER_PUBKEY } from '@/lib/summerBurn';
import { hexToBytes } from '@/lib/utils';

function IdentityToggle({ anon, onChange, disabled }: { anon: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden text-xs w-fit">
      <button type="button" disabled={disabled} onClick={() => onChange(false)}
        className={`px-3 py-1.5 transition-colors ${!anon ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
        🌍 Public
      </button>
      <button type="button" disabled={disabled} onClick={() => onChange(true)}
        className={`px-3 py-1.5 transition-colors ${anon ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
        🥷 Anonymous
      </button>
    </div>
  );
}

const reactionTags = [
  ['e', SWAP_STATUS_EVENT_ID],
  ['p', ORGANIZER_PUBKEY],
  ['k', '1'],
];

export function CDReceivedButton() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending: isPublishing } = useNostrPublish();
  const { anonNsecHex, anonPubkey } = useAnonIdentity();
  const queryClient = useQueryClient();
  const [isAnon, setIsAnon] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const isPending = isPublishing || isPosting;

  const { data: reaction, isLoading } = useQuery({
    queryKey: ['summerburn', 'cd-received', user?.pubkey ?? '', anonPubkey ?? ''],
    queryFn: async (c) => {
      if (!user) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const authors = [user.pubkey, ...(anonPubkey ? [anonPubkey] : [])];
      const events = await nostr.query(
        [{ kinds: [7], authors, '#e': [SWAP_STATUS_EVENT_ID] }],
        { signal },
      );
      return events.find((e) => e.content === REACTION_CD_RECEIVED) ?? null;
    },
    enabled: !!user,
  });

  if (!user || isLoading) return null;

  if (reaction) {
    const date = new Date(reaction.created_at * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const wasAnon = anonPubkey && reaction.pubkey === anonPubkey;
    return (
      <div className="flex items-center gap-3">
        <span className="text-2xl">📀</span>
        <div>
          <p className="font-semibold text-green-700 dark:text-green-400">CDs received!</p>
          <p className="text-xs text-muted-foreground">Confirmed {date} · {wasAnon ? '🥷 anonymously' : '🌍 publicly'}</p>
        </div>
      </div>
    );
  }

  const handleClick = async () => {
    try {
      if (isAnon) {
        if (!anonNsecHex) { toast({ title: 'Generate your anon identity first.' }); return; }
        setIsPosting(true);
        const event = finalizeEvent(
          { kind: 7, content: REACTION_CD_RECEIVED, tags: reactionTags, created_at: Math.floor(Date.now() / 1000) },
          hexToBytes(anonNsecHex),
        );
        await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      } else {
        await publish({ kind: 7, content: REACTION_CD_RECEIVED, tags: reactionTags });
      }
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-received'] });
      toast({ title: '📀 CDs marked as received!', description: 'Enjoy the music!' });
    } catch {
      toast({ title: 'Failed', description: 'Please try again.' });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-3">
      {anonPubkey && <IdentityToggle anon={isAnon} onChange={setIsAnon} disabled={isPending} />}
      <Button
        variant="outline"
        className="border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? 'Confirming…' : '📀 Mark CDs as received'}
      </Button>
    </div>
  );
}
