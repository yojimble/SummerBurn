import { useState, useEffect } from 'react';
import { finalizeEvent, generateSecretKey, nip44, nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAnonIdentity } from '@/hooks/useAnonIdentity';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMixRegistration } from '@/hooks/useMixRegistration';
import { toast } from '@/hooks/useToast';
import { hexToBytes, bytesToHex } from '@/lib/utils';

function mixStatusKey(anonPubkey: string) {
  return `summerburn2026:mix-status:${anonPubkey}`;
}

export function AnonIdentityCard() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { anonNsecHex, anonPubkey, anonNpub, generate, restore } = useAnonIdentity();
  const [restoreInput, setRestoreInput] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [showMixConfirm, setShowMixConfirm] = useState(false);
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [inMix, setInMix] = useState(false);

  useEffect(() => {
    setInMix(anonPubkey ? localStorage.getItem(mixStatusKey(anonPubkey)) === 'added' : false);
  }, [anonPubkey]);

  const sendBackupDM = async (nsecHex: string) => {
    if (!user?.signer.nip44) return;
    const { nip19, getPublicKey } = await import('nostr-tools');
    const pubkey = getPublicKey(hexToBytes(nsecHex));
    const npub = nip19.npubEncode(pubkey);
    const nsecBech32 = nip19.nsecEncode(hexToBytes(nsecHex));
    const message =
      `Bitcoin Summer Burn 2026 — anon identity backup\n\nAnon npub: ${npub}\nAnon nsec: ${nsecBech32}\n\nThis is a backup in case you switch devices or clear your browser. Keep it safe.`;

    // Gift wrap (NIP-59): rumor → seal (anon key) → wrap (random ephemeral key)
    const anonPrivkey = hexToBytes(nsecHex);
    const rumor = {
      kind: 14,
      content: message,
      tags: [['p', user.pubkey]],
      created_at: Math.floor(Date.now() / 1000),
      pubkey,
    };
    const { getEventHash } = await import('nostr-tools/pure');
    (rumor as any).id = getEventHash(rumor as any);

    const sealContent = nip44.v2.encrypt(
      JSON.stringify(rumor),
      nip44.v2.utils.getConversationKey(anonPrivkey, user.pubkey),
    );
    const seal = finalizeEvent({
      kind: 13,
      content: sealContent,
      tags: [],
      created_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 172800),
    }, anonPrivkey);

    const wrapKey = generateSecretKey();
    const convKey = nip44.v2.utils.getConversationKey(wrapKey, user.pubkey);
    const wrapContent = nip44.v2.encrypt(JSON.stringify(seal), convKey);
    const wrap = finalizeEvent({
      kind: 1059,
      content: wrapContent,
      tags: [['p', user.pubkey]],
      created_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 172800),
    }, wrapKey);

    await nostr.event(wrap, { signal: AbortSignal.timeout(15000) });

    // Relays can reply OK without durably storing the event, so confirm it's
    // actually retrievable before treating the send as successful.
    const confirmed = await nostr.query(
      [{ ids: [wrap.id] }],
      { signal: AbortSignal.timeout(10000) },
    );
    if (!confirmed.some(e => e.id === wrap.id)) {
      throw new Error('Relay accepted the event but it could not be confirmed on re-query');
    }
  };

  const { sendAdd, sendRemove } = useMixRegistration();

  const handleGenerate = async () => {
    if (anonNsecHex) {
      if (!confirm('This will replace your current anon identity. Continue?')) return;
    }
    const oldNsecHex = anonNsecHex;
    const oldPubkey = anonPubkey;
    const oldNpub = anonNpub;
    const newHex = generate();
    setIsPending(true);
    try {
      if (oldNsecHex && oldPubkey && oldNpub) {
        await sendRemove();
      }
      await sendBackupDM(newHex);
      toast({
        title: 'Anon identity ready',
        description: "Your browser has saved your key, and we've sent a backup to your Nostr DMs.",
      });
    } catch (err) {
      console.error('AnonIdentityCard: failed to send backup DM on regenerate', err);
      toast({
        title: 'Anon identity created',
        description: 'Saved in your browser. DM backup failed — use the button below to retry.',
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleAddToMix = async () => {
    if (!anonNsecHex || !anonPubkey || !anonNpub) return;
    setIsPending(true);
    try {
      await sendAdd();
      localStorage.setItem(mixStatusKey(anonPubkey), 'added');
      setInMix(true);
      setShowMixConfirm(false);
      toast({ title: "You're in the mix!", description: 'The organiser has your anon npub.' });
    } catch (err) {
      console.error('AnonIdentityCard: failed to send ADD to organiser', err);
      toast({ title: 'Failed', description: 'Could not send to organiser. Try again.' });
    } finally {
      setIsPending(false);
    }
  };

  const handleRemoveFromMix = async () => {
    if (!anonNsecHex || !anonPubkey || !anonNpub) return;
    if (!confirm('Remove yourself from the matching list?')) return;
    setIsPending(true);
    try {
      await sendRemove();
      localStorage.removeItem(mixStatusKey(anonPubkey));
      setInMix(false);
      toast({ title: 'Removed from the mix', description: 'The organiser has been notified.' });
    } catch (err) {
      console.error('AnonIdentityCard: failed to send REMOVE to organiser', err);
      toast({ title: 'Failed', description: 'Could not send to organiser. Try again.' });
    } finally {
      setIsPending(false);
    }
  };

  const handleBackup = async () => {
    if (!user || !anonNsecHex) return;
    setIsPending(true);
    try {
      await sendBackupDM(anonNsecHex);
      toast({ title: 'Backup sent!', description: 'Check your Nostr DMs — encrypted, only you can read it.' });
    } catch (err) {
      console.error('AnonIdentityCard: failed to send backup DM', err);
      toast({ title: 'Backup failed', description: 'Make sure your signer supports NIP-44.' });
    } finally {
      setIsPending(false);
    }
  };

  const handleRestore = () => {
    const input = restoreInput.trim();
    if (!input) return;
    try {
      let hex: string;
      if (input.startsWith('nsec1')) {
        const { data } = nip19.decode(input);
        hex = bytesToHex(data as Uint8Array);
      } else {
        hex = input;
      }
      restore(hex);
      setRestoreInput('');
      setShowRestore(false);
      toast({ title: 'Anon identity restored!', description: 'Your key is saved in this browser.' });
    } catch {
      toast({ title: 'Invalid key', description: 'Paste your nsec1… or hex key from your backup DM.' });
    }
  };

  const header = (
    <CardHeader className="py-3">
      <CollapsibleTrigger asChild>
        <button type="button" className="flex items-center justify-between w-full text-left">
          <CardTitle className="text-base">Your Anon Swap Identity</CardTitle>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
    </CardHeader>
  );

  if (!anonNsecHex || !anonPubkey) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card>
          {header}
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              <p className="text-sm text-muted-foreground">
                Generate a fresh anonymous identity for this swap. You'll use it to send your postal
                address to your CD partners without revealing who you are on Nostr. Your browser will
                save the key, and we'll DM you a backup automatically.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleGenerate} disabled={isPending}>
                  {isPending ? 'Generating…' : 'Generate anon identity'}
                </Button>
                <Button variant="outline" onClick={() => setShowRestore((v) => !v)}>
                  Restore from backup
                </Button>
              </div>
              {showRestore && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground">Paste your nsec from your backup DM.</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="nsec1… or hex"
                      value={restoreInput}
                      onChange={(e) => setRestoreInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <Button size="sm" onClick={handleRestore} disabled={!restoreInput.trim()}>
                      Restore
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        {header}
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Anon npub</p>
              <p className="font-mono text-xs break-all bg-muted p-2 rounded">{anonNpub}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Your browser has saved this key, and a backup has been sent to your Nostr DMs —
              check there if you ever switch devices.
            </p>
            {inMix && (
              <p className="text-xs font-medium text-green-600">✓ You're in the mix — the organiser has this anon npub.</p>
            )}
            <div className="flex gap-2 flex-wrap">
              {inMix ? (
                <Button size="sm" variant="destructive" onClick={handleRemoveFromMix} disabled={isPending}>
                  {isPending ? 'Sending…' : 'Remove me from the mix'}
                </Button>
              ) : (
                <Button size="sm" onClick={() => setShowMixConfirm(v => !v)} disabled={isPending}>
                  Add me to the mix
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleBackup} disabled={isPending}>
                {isPending ? 'Sending…' : 'Re-send backup DM'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isPending}>
                Regenerate
              </Button>
            </div>
            {showMixConfirm && !inMix && (
              <div className="rounded-md border border-border bg-muted/40 p-3 space-y-3">
                <p className="text-xs text-muted-foreground">This npub will be sent to the organiser as a gift-wrapped DM:</p>
                <p className="font-mono text-xs break-all bg-muted p-2 rounded">ADD<br />{anonNpub}</p>
                <Button size="sm" onClick={handleAddToMix} disabled={isPending} className="w-full">
                  {isPending ? 'Sending…' : 'Send DM to join the matching list anonymously'}
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
