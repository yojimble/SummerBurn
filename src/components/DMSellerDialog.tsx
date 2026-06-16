import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useSendDM } from '@/hooks/useSendDM';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from '@/hooks/useToast';

interface DMSellerDialogProps {
  recipientPubkey: string;
  recipientName: string;
}

export function DMSellerDialog({ recipientPubkey, recipientName }: DMSellerDialogProps) {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('Is this available?');
  const { mutateAsync: sendDM, isPending } = useSendDM();

  const handleSend = async () => {
    if (!content.trim()) return;
    try {
      await sendDM({ recipientPubkey, content: content.trim() });
      toast({ title: 'Message sent!' });
      setOpen(false);
    } catch (e) {
      toast({ title: 'Failed to send', description: e instanceof Error ? e.message : 'Please try again.' });
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" aria-label={`Message ${recipientName}`}>💬</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Message {recipientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button onClick={handleSend} disabled={isPending || !content.trim()} className="w-full">
            {isPending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
