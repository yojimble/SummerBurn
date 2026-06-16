import { useState } from 'react';
import { useNostr } from '@nostrify/react';
import { getZapEndpoint, makeZapRequest } from 'nostr-tools/nip57';
import QRCode from 'qrcode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/useToast';
import { ORGANIZER_PUBKEY } from '@/lib/summerBurn';

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000]; // sats

function satsLabel(sats: number) {
  if (sats >= 1000) return `${sats / 1000}k`;
  return String(sats);
}

export function ZapDonation() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { data: organiserProfile } = useAuthor(ORGANIZER_PUBKEY);

  const [amount, setAmount] = useState(2000);
  const [customAmount, setCustomAmount] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const effectiveAmount = customAmount ? parseInt(customAmount) * 1000 : amount;

  const handleZap = async () => {
    if (!effectiveAmount || effectiveAmount < 1) return;
    setIsPending(true);
    try {
      // Get the organiser's LNURL endpoint from their Nostr profile
      const profileEvent = organiserProfile?.event;
      if (!profileEvent) throw new Error('Could not load organiser profile. Try again in a moment.');

      const zapEndpoint = await getZapEndpoint(profileEvent);
      if (!zapEndpoint) throw new Error('Organiser has no Lightning address set on their Nostr profile yet.');

      // Build a NIP-57 zap request event
      const zapRequestEvent = makeZapRequest({
        profile: ORGANIZER_PUBKEY,
        event: null,
        amount: effectiveAmount,
        relays: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band'],
        comment: 'Bitcoin Summer Burn 2026 — postage contribution ⚡',
      });

      // Sign the zap request with the user's signer if logged in, otherwise unsigned
      let signedZapRequest: string;
      if (user) {
        const signed = await user.signer.signEvent(zapRequestEvent);
        signedZapRequest = encodeURIComponent(JSON.stringify(signed));
      } else {
        signedZapRequest = encodeURIComponent(JSON.stringify(zapRequestEvent));
      }

      // Fetch a Lightning invoice from the LNURL endpoint
      const url = new URL(zapEndpoint);
      url.searchParams.set('amount', String(effectiveAmount));
      url.searchParams.set('nostr', signedZapRequest);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('LNURL request failed');
      const data = await res.json();
      if (data.status === 'ERROR') throw new Error(data.reason ?? 'LNURL error');
      if (!data.pr) throw new Error('No invoice returned');

      const bolt11 = data.pr as string;

      // Try WebLN (Alby or other browser wallet)
      if (typeof window !== 'undefined' && (window as any).webln) {
        try {
          await (window as any).webln.enable();
          await (window as any).webln.sendPayment(bolt11);
          toast({ title: '⚡ Zapped!', description: `${(effectiveAmount / 1000).toLocaleString()}k sats sent. Thank you!` });
          setIsPending(false);
          return;
        } catch {
          // WebLN failed or user cancelled — fall through to QR
        }
      }

      // Fall back to QR code
      const qr = await QRCode.toDataURL(`lightning:${bolt11}`, { width: 300, margin: 2 });
      setInvoice(bolt11);
      setQrDataUrl(qr);
    } catch (e: any) {
      toast({ title: 'Zap failed', description: e?.message ?? 'Something went wrong.' });
    } finally {
      setIsPending(false);
    }
  };

  const copyInvoice = () => {
    if (!invoice) return;
    navigator.clipboard.writeText(invoice);
    toast({ title: 'Copied!', description: 'Paste into your Lightning wallet.' });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">⚡ Contribute to Postage Costs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sending CDs abroad adds up. If you'd like to chip in a few sats towards postage,
            zap the organiser directly — every bit helps.
          </p>

          {/* Preset amounts */}
          <div className="flex flex-wrap gap-2">
            {PRESET_AMOUNTS.map(sats => (
              <Button
                key={sats}
                variant={!customAmount && amount === sats ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setAmount(sats); setCustomAmount(''); }}
              >
                {satsLabel(sats)} sats
              </Button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              placeholder="Custom (k sats)"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              className="w-36 text-sm"
            />
            <span className="text-sm text-muted-foreground">k sats</span>
          </div>

          <Button onClick={handleZap} disabled={isPending || !effectiveAmount}>
            {isPending ? 'Getting invoice…' : `⚡ Zap ${customAmount ? `${customAmount}k` : satsLabel(effectiveAmount)} sats`}
          </Button>
        </CardContent>
      </Card>

      {/* QR code fallback dialog */}
      <Dialog open={!!invoice} onOpenChange={open => { if (!open) { setInvoice(null); setQrDataUrl(null); } }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>⚡ Pay with Lightning</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Scan with your Lightning wallet or copy the invoice below.
          </p>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="Lightning invoice QR code" className="mx-auto rounded-lg" />
          )}
          <Button variant="outline" size="sm" onClick={copyInvoice} className="w-full">
            Copy invoice
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
