import { useState } from 'react';
import { useNostr } from '@nostrify/react';
import { getZapEndpoint, makeZapRequest } from 'nostr-tools/nip57';
import QRCode from 'qrcode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';

const PRESET_AMOUNTS = [210, 1000, 2000, 5000];

function satsLabel(sats: number) {
  if (sats >= 1000) return `${sats / 1000}k`;
  return String(sats);
}

interface AnonZapButtonProps {
  anonPubkey: string;
  label: string; // e.g. "Sender 1"
}

export function AnonZapButton({ anonPubkey, label }: AnonZapButtonProps) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(2000);
  const [customAmount, setCustomAmount] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const effectiveAmount = customAmount ? parseInt(customAmount) : amount;

  // Fetch the anon profile to check if they have a Lightning address
  const { data: hasLightning } = useQuery({
    queryKey: ['anon-profile', anonPubkey],
    queryFn: async (c) => {
      const events = await nostr.query(
        [{ kinds: [0], authors: [anonPubkey], limit: 1 }],
        { signal: AbortSignal.any([c.signal, AbortSignal.timeout(5000)]) },
      );
      if (!events.length) return false;
      try {
        const meta = JSON.parse(events[0].content);
        return !!meta.lud16;
      } catch {
        return false;
      }
    },
    staleTime: 300000,
  });

  if (!hasLightning) return null;

  const handleZap = async () => {
    if (!effectiveAmount || effectiveAmount < 1) return;
    setIsPending(true);
    try {
      // Fetch the anon profile event to pass to getZapEndpoint
      const events = await nostr.query(
        [{ kinds: [0], authors: [anonPubkey], limit: 1 }],
        { signal: AbortSignal.timeout(5000) },
      );
      if (!events.length) throw new Error('Could not load profile');

      const zapEndpoint = await getZapEndpoint(events[0]);
      if (!zapEndpoint) throw new Error('No Lightning address on this profile');

      const zapRequest = makeZapRequest({
        pubkey: anonPubkey,
        amount: effectiveAmount,
        relays: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band'],
        comment: `Bitcoin Summer Burn 2026 — thanks for the CD ⚡`,
      });

      let signedZapRequest: string;
      if (user) {
        const signed = await user.signer.signEvent(zapRequest);
        signedZapRequest = encodeURIComponent(JSON.stringify(signed));
      } else {
        signedZapRequest = encodeURIComponent(JSON.stringify(zapRequest));
      }

      const url = new URL(zapEndpoint);
      url.searchParams.set('amount', String(effectiveAmount));
      url.searchParams.set('nostr', signedZapRequest);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('LNURL request failed');
      const data = await res.json();
      if (data.status === 'ERROR') throw new Error(data.reason ?? 'LNURL error');
      if (!data.pr) throw new Error('No invoice returned');

      const bolt11 = data.pr as string;

      if (typeof window !== 'undefined' && (window as any).webln) {
        try {
          await (window as any).webln.enable();
          await (window as any).webln.sendPayment(bolt11);
          toast({ title: `⚡ Zapped ${label}!`, description: 'Sats sent their way.' });
          setOpen(false);
          setIsPending(false);
          return;
        } catch {
          // fall through to QR
        }
      }

      const qr = await QRCode.toDataURL(`lightning:${bolt11}`, { width: 280, margin: 2 });
      setInvoice(bolt11);
      setQrDataUrl(qr);
    } catch (e: any) {
      toast({ title: 'Zap failed', description: e?.message ?? 'Something went wrong.' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        ⚡ Zap if you loved the CD
      </Button>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setInvoice(null); setQrDataUrl(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>⚡ Zap {label}</DialogTitle>
          </DialogHeader>

          {!invoice ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enjoyed their CD? Send a few sats to say thanks. Their identity stays anonymous.
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
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
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="Custom"
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  className="text-sm"
                />
                <span className="text-sm text-muted-foreground">sats</span>
              </div>
              <Button onClick={handleZap} disabled={isPending || !effectiveAmount} className="w-full">
                {isPending ? 'Getting invoice…' : `⚡ Zap ${satsLabel(effectiveAmount)} sats`}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                Scan with your Lightning wallet or copy the invoice.
              </p>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="Lightning QR" className="mx-auto rounded-lg" />
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { navigator.clipboard.writeText(invoice!); toast({ title: 'Copied!' }); }}
              >
                Copy invoice
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
