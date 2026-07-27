import { useState } from 'react';
import { finalizeEvent, nip04, getPublicKey } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/useToast';
import { hexToBytes } from '@/lib/utils';

interface SendAddressDialogProps {
  senderAnonPubkey: string;
  anonNsecHex: string;
  label: string;
  onSent?: () => void;
}

export function SendAddressDialog({ senderAnonPubkey, anonNsecHex, label, onSent }: SendAddressDialogProps) {
  const { nostr } = useNostr();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSend = async () => {
    if (!address.trim()) return;
    setIsPending(true);
    try {
      const privkeyBytes = hexToBytes(anonNsecHex);
      const anonPubkey = getPublicKey(privkeyBytes);

      // Encrypt with NIP-04 to the sender's anon pubkey
      const encrypted = await nip04.encrypt(anonNsecHex, senderAnonPubkey, address.trim());

      const event = finalizeEvent(
        {
          kind: 4,
          created_at: Math.floor(Date.now() / 1000),
          tags: [['p', senderAnonPubkey]],
          content: encrypted,
        },
        privkeyBytes,
      );

      await nostr.event(event, { signal: AbortSignal.timeout(5000) });

      console.debug('Address DM sent from anon pubkey', anonPubkey, 'to anon pubkey', senderAnonPubkey);

      toast({
        title: 'Address sent!',
        description: `${label} can now post your CD. Neither of you knows the other's identity.`,
      });
      setAddress('');
      setOpen(false);
      onSent?.();
    } catch {
      toast({ title: 'Failed to send', description: 'Please try again.' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Send my address</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send your address to {label}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Encrypted and sent from your anonymous npub to {label}'s anonymous npub.
          They'll know where to post your CD — nothing else.
        </p>
        <Textarea
          placeholder={'123 Street\nCity\nPostcode\nCountry'}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={5}
          className="font-mono text-sm"
        />
        <Button onClick={handleSend} disabled={!address.trim() || isPending} className="w-full">
          {isPending ? 'Sending…' : 'Send anonymously'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
