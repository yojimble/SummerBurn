import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from '@/hooks/useToast';
import { HASHTAG } from '@/lib/summerBurn';
import type { NostrEvent } from '@nostrify/nostrify';

interface ReplyFormProps {
  root: NostrEvent;
}

export function ReplyForm({ root }: ReplyFormProps) {
  const { user } = useCurrentUser();
  const [content, setContent] = useState('');
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  if (!user) return null;

  const handleReply = async () => {
    if (!content.trim()) return;
    try {
      await publish({
        kind: 1,
        content: content.trim(),
        tags: [
          ['e', root.id, '', 'root'],
          ['p', root.pubkey],
          ['t', HASHTAG],
        ],
      });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'thread', root.id] });
      toast({ title: 'Reply posted!' });
      setContent('');
    } catch {
      toast({ title: 'Failed to post reply', description: 'Please try again.' });
    }
  };

  return (
    <div className="space-y-2 pt-4 border-t border-border">
      <Textarea
        placeholder="Write a reply…"
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        className="resize-none"
      />
      <Button
        onClick={handleReply}
        disabled={isPending || !content.trim()}
        size="sm"
      >
        {isPending ? 'Posting…' : 'Reply'}
      </Button>
    </div>
  );
}
