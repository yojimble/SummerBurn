import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { toast } from '@/hooks/useToast';
import { HASHTAG } from '@/lib/summerBurn';

export function NewThreadDialog() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const { mutateAsync: publish, isPending } = useNostrPublish();

  const handlePost = async () => {
    if (!content.trim()) return;
    try {
      const tags: string[][] = [['t', HASHTAG]];
      if (subject.trim()) tags.push(['subject', subject.trim()]);

      await publish({ kind: 1, content: content.trim(), tags });
      toast({ title: 'Thread posted!' });
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
        <Button>+ New thread</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a new thread</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Subject (optional)"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
          <Textarea
            placeholder="What's on your mind?"
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
