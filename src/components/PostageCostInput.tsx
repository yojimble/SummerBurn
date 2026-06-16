import { useState } from 'react';
import { finalizeEvent } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/useToast';
import { hexToBytes } from '@/lib/utils';
import { KIND_POSTAGE_COST } from '@/lib/summerBurn';

interface PostageCostInputProps {
  recipientAnonPubkey: string;
  anonNsecHex: string;
  existingCost?: string;
}

export function PostageCostInput({ recipientAnonPubkey, anonNsecHex, existingCost }: PostageCostInputProps) {
  const { nostr } = useNostr();
  const [cost, setCost] = useState(existingCost ?? '');
  const [isPending, setIsPending] = useState(false);

  const handleSave = async () => {
    if (!cost.trim()) return;
    setIsPending(true);
    try {
      const event = finalizeEvent(
        {
          kind: KIND_POSTAGE_COST,
          created_at: Math.floor(Date.now() / 1000),
          tags: [['d', recipientAnonPubkey]],
          content: cost.trim(),
        },
        hexToBytes(anonNsecHex),
      );
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      toast({ title: 'Postage cost saved', description: 'Your recipient can now see how much to zap you.' });
    } catch {
      toast({ title: 'Failed to save', description: 'Please try again.' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="e.g. £1.85 or $3.00"
        value={cost}
        onChange={e => setCost(e.target.value)}
        className="text-sm w-36"
      />
      <Button
        size="sm"
        variant="outline"
        onClick={handleSave}
        disabled={isPending || !cost.trim()}
      >
        {isPending ? 'Saving…' : existingCost ? 'Update' : 'Save'}
      </Button>
    </div>
  );
}
