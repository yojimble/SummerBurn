import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSendDM } from '@/hooks/useSendDM';
import { toast } from '@/hooks/useToast';

interface Props {
  senderAnonPubkey: string;
}

export function CDReceivedButton({ senderAnonPubkey }: Props) {
  const { user } = useCurrentUser();
  const { mutateAsync: sendDM } = useSendDM();
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!user) return null;

  if (sent) {
    return <p className="text-xs text-green-600 font-medium">📀 Sender notified!</p>;
  }

  const handleClick = async () => {
    setIsSending(true);
    try {
      await sendDM({
        recipientPubkey: senderAnonPubkey,
        content: '📀 Your CD arrived! Thanks so much 🔥',
      });
      setSent(true);
      toast({ title: '📀 Sender notified!', description: 'They\'ll get a DM letting them know their CD arrived.' });
    } catch {
      toast({ title: 'Failed to send', description: 'Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-950 text-xs"
      disabled={isSending}
      onClick={handleClick}
    >
      {isSending ? 'Sending…' : '📀 Mark as received'}
    </Button>
  );
}
