import { useState } from 'react';
import { useNostr } from '@nostrify/react';
import { getZapEndpoint, makeZapRequest } from 'nostr-tools/nip57';
import QRCode from 'qrcode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/useToast';
import { useQuery } from '@tanstack/react-query';

const PRESET_AMOUNTS = [1000, 2000, 5000];

interface ZapButtonProps {
  pubkey: string; // hex pubkey
  label: string;
}

export function ZapButton({ pubkey, label }: ZapButtonProps) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(2000);
  const [isPending, setIsPending] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const { data: hasLightning } = useQuery({
    queryKey: ['profile-ln', pubkey],
    queryFn: async (c) => {
      const events = await nostr.query(
        [{ kinds: [0], authors: [pubkey], limit: 1 }],
        { signal: AbortSignal.any([c.signal, AbortSignal.timeout(5000)]) },
      );
      if (!events.length) return false;
      try {
        const meta = JSON.parse(events[0].content);
        return !!(meta.lud16 || meta.lud06);
      } catch {
        return false;
      }
    },
    staleTime: 300000,
  });

  const handleZap = async () => {
    setIsPending(true);
    try {
      const events = await nostr.query(
        [{ kinds: [0], authors: [pubkey], limit: 1 }],
        { signal: AbortSignal.timeout(5000) },
      );
      if (!events.length) throw new Error('Could not load profile');

      const zapEndpoint = await getZapEndpoint(events[0]);
      if (!zapEndpoint) throw new Error('No Lightning address on this profile');

      const zapRequest = makeZapRequest({
        profile: pubkey,
        event: null,
        amount,
        relays: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band'],
        comment: `⚡ Zapped via Bitcoin Summer Burn 2026`,
      });

      let signedZapRequest: string;
      if (user) {
        const signed = await user.signer.signEvent(zapRequest);
        signedZapRequest = encodeURIComponent(JSON.stringify(signed));
      } else {
        signedZapRequest = encodeURIComponent(JSON.stringify(zapRequest));
      }

      const url = new URL(zapEndpoint);
      url.searchParams.set('amount', String(amount));
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
          toast({ title: `⚡ Zapped ${label}!` });
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

  if (hasLightning === false) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="inline-flex">
        ⚡ Zap {label}
      </Button>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setInvoice(null); setQrDataUrl(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>⚡ Zap {label}</DialogTitle>
          </DialogHeader>

          {!invoice ? (
            <div className="space-y-4">
              <div className="flex gap-2 justify-center flex-wrap">
                {PRESET_AMOUNTS.map(sats => (
                  <Button
                    key={sats}
                    variant={amount === sats ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAmount(sats)}
                  >
                    {sats / 1000}k sats
                  </Button>
                ))}
              </div>
              <Button onClick={handleZap} disabled={isPending} className="w-full">
                {isPending ? 'Getting invoice…' : `⚡ Zap ${amount / 1000}k sats`}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">Scan with your Lightning wallet or copy the invoice.</p>
              {qrDataUrl && <img src={qrDataUrl} alt="Lightning QR" className="mx-auto rounded-lg" />}
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
