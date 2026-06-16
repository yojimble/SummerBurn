import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { toast } from '@/hooks/useToast';
import { HASHTAG } from '@/lib/summerBurn';
import type { NostrEvent } from '@nostrify/nostrify';
import { X } from 'lucide-react';

interface ReplyFormProps {
  root: NostrEvent;
  /** The post being replied to, quoted inline so it's clear what this reply is responding to. */
  quoting?: NostrEvent;
  onClearQuote?: () => void;
}

function quoteBlock(content: string): string {
  return content
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

export function ReplyForm({ root, quoting, onClearQuote }: ReplyFormProps) {
  const { user } = useCurrentUser();
  const [content, setContent] = useState('');
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();
  const { data: quotedAuthor } = useAuthor(quoting?.pubkey ?? '');

  // Prefill the textarea with a quoted block whenever a new post is quoted.
  useEffect(() => {
    if (!quoting) return;
    setContent(`${quoteBlock(quoting.content)}\n\n`);
  }, [quoting]);

  if (!user) return null;

  const quotedName =
    quotedAuthor?.metadata?.display_name ??
    quotedAuthor?.metadata?.name ??
    (quoting ? `${nip19.npubEncode(quoting.pubkey).slice(0, 12)}…` : '');

  const handleReply = async () => {
    if (!content.trim()) return;
    try {
      const tags: string[][] = [
        ['e', root.id, '', 'root'],
        ['p', root.pubkey],
        ['t', HASHTAG],
      ];
      if (quoting && quoting.id !== root.id) {
        tags.push(['e', quoting.id, '', 'mention']);
        if (quoting.pubkey !== root.pubkey) tags.push(['p', quoting.pubkey]);
      }

      await publish({ kind: 1, content: content.trim(), tags });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'thread', root.id] });
      toast({ title: 'Reply posted!' });
      setContent('');
      onClearQuote?.();
    } catch {
      toast({ title: 'Failed to post reply', description: 'Please try again.' });
    }
  };

  return (
    <div className="space-y-2 pt-4 border-t border-border">
      {quoting && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Replying to {quotedName}</span>
          <button
            type="button"
            onClick={() => { onClearQuote?.(); setContent(''); }}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      )}
      <Textarea
        placeholder="Write a reply…"
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={quoting ? 5 : 3}
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
