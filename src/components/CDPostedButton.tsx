import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { toast } from '@/hooks/useToast';
import { KIND_CD_POSTED, RSVP_D_TAG } from '@/lib/summerBurn';

export function CDPostedButton() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  const { data: postedEvent, isLoading } = useQuery({
    queryKey: ['summerburn', 'cd-posted', user?.pubkey ?? ''],
    queryFn: async (c) => {
      if (!user) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const [event] = await nostr.query(
        [{ kinds: [KIND_CD_POSTED], authors: [user.pubkey], '#d': [`${RSVP_D_TAG}-posted`], limit: 1 }],
        { signal },
      );
      return event ?? null;
    },
    enabled: !!user,
  });

  if (!user || isLoading) return null;

  if (postedEvent) {
    const date = new Date(postedEvent.created_at * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return (
      <div className="flex items-center gap-3">
        <span className="text-2xl">📬</span>
        <div>
          <p className="font-semibold text-green-700 dark:text-green-400">CDs posted!</p>
          <p className="text-xs text-muted-foreground">Confirmed {date}</p>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      className="border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
      disabled={isPending}
      onClick={async () => {
        try {
          await publish({
            kind: KIND_CD_POSTED,
            content: '',
            tags: [['d', `${RSVP_D_TAG}-posted`], ['t', RSVP_D_TAG]],
          });
          queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-posted'] });
          toast({ title: '📬 CDs marked as posted!', description: 'Nicely done. Now sit back and wait for yours to arrive.' });
        } catch {
          toast({ title: 'Failed', description: 'Please try again.' });
        }
      }}
    >
      {isPending ? 'Confirming…' : '📬 Mark CDs as posted'}
    </Button>
  );
}
