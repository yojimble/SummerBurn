import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { toast } from '@/hooks/useToast';
import { HASHTAG, FORUM_TAG } from '@/lib/summerBurn';
import type { NostrEvent } from '@nostrify/nostrify';

interface NewThreadDialogProps {
  /** When set, the new thread quotes this post (NIP-18). */
  quoting?: NostrEvent;
}

export function NewThreadDialog({ quoting }: NewThreadDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  const handlePost = async () => {
    if (!content.trim()) return;
    try {
      const tags: string[][] = [['t', HASHTAG], ['t', FORUM_TAG]];
      if (subject.trim()) tags.push(['subject', subject.trim()]);

      let finalContent = content.trim();
      if (quoting) {
        const nevent = nip19.neventEncode({ id: quoting.id, author: quoting.pubkey });
        tags.push(['q', quoting.id, '', quoting.pubkey]);
        tags.push(['p', quoting.pubkey]);
        finalContent = `${finalContent}\n\nnostr:${nevent}`;
      }

      await publish({ kind: 1, content: finalContent, tags });
      if (quoting) {
        queryClient.invalidateQueries({ queryKey: ['summerburn', 'threads'] });
      }
      toast({ title: quoting ? 'Quote posted!' : 'Thread posted!' });
      setSubject('');
      setContent('');
      setOpen(false);
    } catch {
      toast({ title: 'Failed to post', description: 'Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {quoting ? (
          <Button variant="ghost" size="sm">↩ Quote</Button>
        ) : (
          <Button>+ New thread</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{quoting ? 'Quote this post' : 'Start a new thread'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {quoting && (
            <blockquote className="text-sm text-muted-foreground border-l-2 border-border pl-3 line-clamp-3">
              {quoting.content}
            </blockquote>
          )}
          {!quoting && (
            <Input
              placeholder="Subject (optional)"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          )}
          <Textarea
            placeholder={quoting ? 'Add your comment…' : "What's on your mind?"}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <Button
            onClick={handlePost}
            disabled={isPending || !content.trim()}
            className="w-full"
          >
            {isPending ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
