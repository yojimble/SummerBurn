import { useState } from 'react';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAuthor } from '@/hooks/useAuthor';
import { useCDComments, cdListingAddress, KIND_COMMENT } from '@/hooks/useCDComments';
import { KIND_CD_LISTING } from '@/lib/summerBurn';
import { toast } from '@/hooks/useToast';
import type { NostrEvent } from '@nostrify/nostrify';

function Comment({ event }: { event: NostrEvent }) {
  const { data: author } = useAuthor(event.pubkey);
  const name =
    author?.metadata?.display_name ??
    author?.metadata?.name ??
    nip19.npubEncode(event.pubkey).slice(0, 12) + '…';

  return (
    <div className="flex gap-3">
      <Link to={`/${nip19.npubEncode(event.pubkey)}`} className="shrink-0">
        <Avatar className="h-7 w-7">
          <AvatarImage src={author?.metadata?.picture} alt={name} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="space-y-0.5">
        <Link to={`/${nip19.npubEncode(event.pubkey)}`} className="text-sm font-medium hover:underline">
          {name}
        </Link>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{event.content}</p>
      </div>
    </div>
  );
}

export function CDComments({ sellerPubkey }: { sellerPubkey: string }) {
  const { user } = useCurrentUser();
  const { data: comments } = useCDComments(sellerPubkey);
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const address = cdListingAddress(sellerPubkey);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      await publish({
        kind: KIND_COMMENT,
        content: content.trim(),
        tags: [
          ['A', address, '', 'root'],
          ['K', String(KIND_CD_LISTING)],
          ['P', sellerPubkey],
        ],
      });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-comments', sellerPubkey] });
      toast({ title: 'Comment posted!' });
      setContent('');
    } catch {
      toast({ title: 'Failed to post comment', description: 'Please try again.' });
    }
  };

  return (
    <div className="space-y-6 mt-12 pt-8 border-t border-border">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Comments</h2>

      {comments && comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((c) => <Comment key={c.id} event={c} />)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      )}

      {user ? (
        <div className="space-y-2">
          <Textarea
            placeholder="Leave a comment…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button size="sm" disabled={isPending || !content.trim()} onClick={handleSubmit}>
            {isPending ? 'Posting…' : 'Post comment'}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Log in to leave a comment.</p>
      )}
    </div>
  );
}
