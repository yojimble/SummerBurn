import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { toast } from '@/hooks/useToast';
import { HASHTAG } from '@/lib/summerBurn';

const DEFAULT_NOTE = `📬 CDs posted! Three mixes winging their way to three lucky Burners. Now the wait begins... 🔥 #${HASHTAG}`;

export function ShareCDsButton() {
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const [noteText, setNoteText] = useState(DEFAULT_NOTE);
  const [shared, setShared] = useState(false);

  if (shared) {
    return <p className="text-sm text-green-600">✓ Shared to Nostr</p>;
  }

  const handleShare = async () => {
    if (!noteText.trim()) return;
    try {
      await publish({ kind: 1, content: noteText.trim(), tags: [['t', HASHTAG]] });
      setShared(true);
      toast({ title: 'Shared to Nostr!' });
    } catch {
      toast({ title: 'Failed to share', description: 'Please try again.' });
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        rows={3}
        className="text-sm"
        disabled={isPending}
      />
      <Button variant="outline" size="sm" onClick={handleShare} disabled={isPending}>
        {isPending ? 'Sharing…' : '📢 Share to Nostr'}
      </Button>
    </div>
  );
}
