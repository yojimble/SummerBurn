import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useLikes } from '@/hooks/useLikes';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

export function LikeButton({ event }: { event: NostrEvent }) {
  const { user } = useCurrentUser();
  const { data, likedByMe } = useLikes(event.id);
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  const handleLike = async () => {
    if (!user || likedByMe) return;
    try {
      await publish({
        kind: 7,
        content: '+',
        tags: [
          ['e', event.id],
          ['p', event.pubkey],
        ],
      });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'likes', event.id] });
    } catch {
      toast({ title: 'Failed to like', description: 'Please try again.' });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={!user || likedByMe || isPending}
      className={likedByMe ? 'text-red-500' : ''}
    >
      {likedByMe ? '❤️' : '🤍'} {data?.count ?? 0}
    </Button>
  );
}
