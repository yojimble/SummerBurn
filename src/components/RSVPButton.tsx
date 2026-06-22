import { useNostr } from '@nostrify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { toast } from '@/hooks/useToast';
import { RSVP_D_TAG, CALENDAR_EVENT_COORDINATE } from '@/lib/summerBurn';

export function RSVPButton() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publish } = useNostrPublish();
  const queryClient = useQueryClient();

  const { data: myRSVP, isLoading: rsvpLoading } = useQuery({
    queryKey: ['summerburn', 'my-rsvp', user?.pubkey ?? ''],
    queryFn: async (c) => {
      if (!user?.pubkey) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const [event] = await nostr.query(
        [{ kinds: [31925], authors: [user.pubkey], '#d': [RSVP_D_TAG], limit: 1 }],
        { signal },
      );
      return event ?? null;
    },
    enabled: !!user?.pubkey,
  });

  const isRSVPd = myRSVP?.tags.find(([n]) => n === 'status')?.[1] === 'accepted';

  const { mutate: doRSVP, isPending } = useMutation({
    mutationFn: async (status: 'accepted' | 'declined') => {
      if (!CALENDAR_EVENT_COORDINATE) throw new Error('Calendar event not set up yet.');
      await publish({
        kind: 31925,
        content: '',
        tags: [
          ['d', RSVP_D_TAG],
          ['status', status],
          ['a', CALENDAR_EVENT_COORDINATE],
        ],
      });
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['summerburn'] });
      toast({
        title: status === 'accepted' ? "You're in! 🔥" : 'RSVP removed',
        description:
          status === 'accepted'
            ? 'Welcome to Bitcoin Summer Burn 2026!'
            : "Sorry to see you go. You can RSVP again any time.",
      });
    },
    onError: () => {
      toast({ title: 'Something went wrong', description: 'Please try again.' });
    },
  });

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Log in with Nostr to RSVP
      </p>
    );
  }

  if (rsvpLoading) {
    return <Button size="sm" disabled>Loading…</Button>;
  }

  if (isRSVPd) {
    return (
      <div className="flex flex-row items-center justify-center gap-3">
        <p className="text-green-600 dark:text-green-400 font-semibold">✓ You're signed up!</p>
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => doRSVP('declined')}>
          {isPending ? 'Updating…' : 'Un-RSVP'}
        </Button>
      </div>
    );
  }

  return (
    <Button size="lg" disabled={isPending} onClick={() => doRSVP('accepted')} className="px-8">
      {isPending ? 'RSVPing…' : '🔥 RSVP for Bitcoin Summer Burn 2026'}
    </Button>
  );
}
