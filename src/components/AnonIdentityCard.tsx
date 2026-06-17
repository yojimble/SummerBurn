import { useState } from 'react';
import { finalizeEvent, generateSecretKey, nip44, nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAnonIdentity } from '@/hooks/useAnonIdentity';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { toast } from '@/hooks/useToast';
import { hexToBytes, bytesToHex } from '@/lib/utils';
import { ORGANIZER_PUBKEY } from '@/lib/summerBurn';

export function AnonIdentityCard() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { anonNsecHex, anonPubkey, anonNpub, generate, restore } = useAnonIdentity();
  const [restoreInput, setRestoreInput] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const { mutateAsync: publish, isPending } = useNostrPublish();

  const [lightningAddress, setLightningAddress] = useState('');
  const [savingLn, setSavingLn] = useState(false);

  const sendBackupDM = async (nsecHex: string) => {
    if (!user?.signer.nip44) return;
    const { nip19, getPublicKey } = await import('nostr-tools');
    const pubkey = getPublicKey(hexToBytes(nsecHex));
    const npub = nip19.npubEncode(pubkey);
    const nsecBech32 = nip19.nsecEncode(hexToBytes(nsecHex));
    const message =
      `Bitcoin Summer Burn 2026 — anon identity backup\n\nAnon npub: ${npub}\nAnon nsec: ${nsecBech32}\n\nThis is a backup in case you switch devices or clear your browser. Keep it safe.`;

    // Gift wrap (NIP-59): rumor → seal (signer) → wrap (random ephemeral key)
    const rumor = {
      kind: 14,
      content: message,
      tags: [['p', user.pubkey]],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: user.pubkey,
    };
    const { getEventHash } = await import('nostr-tools/pure');
    (rumor as any).id = getEventHash(rumor as any);

    const sealContent = await user.signer.nip44.encrypt(user.pubkey, JSON.stringify(rumor));
    const seal = await user.signer.signEvent({
      kind: 13,
      content: sealContent,
      tags: [],
      created_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 172800),
    });

    const wrapKey = generateSecretKey();
    const convKey = nip44.v2.utils.getConversationKey(wrapKey, user.pubkey);
    const wrapContent = nip44.v2.encrypt(JSON.stringify(seal), convKey);
    const wrap = finalizeEvent({
      kind: 1059,
      content: wrapContent,
      tags: [['p', user.pubkey]],
      created_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 172800),
    }, wrapKey);

    await nostr.event(wrap, { signal: AbortSignal.timeout(5000) });
  };

  const handleGenerate = async () => {
    if (anonNsecHex) {
      if (!confirm('This will replace your current anon identity. Continue?')) return;
    }
    const newHex = generate();

    if (user) {
      try {
        await sendBackupDM(newHex);

        if (ORGANIZER_PUBKEY && user.signer.nip44) {
          const { getPublicKey } = await import('nostr-tools');
          const newPubkey = getPublicKey(hexToBytes(newHex));
          const encrypted = await user.signer.nip44.encrypt(
            ORGANIZER_PUBKEY,
            JSON.stringify({ anonPubkey: newPubkey }),
          );
          await publish({ kind: 4, content: encrypted, tags: [['p', ORGANIZER_PUBKEY]] });
        }

        toast({
          title: 'Anon identity ready',
          description: "Your browser has saved your key, and we've sent a backup to your Nostr DMs.",
        });
      } catch {
        toast({
          title: 'Anon identity created',
          description: 'Saved in your browser. DM backup failed — use the button below to retry.',
        });
      }
    }
  };

  const handleBackup = async () => {
    if (!user || !anonNsecHex) return;
    try {
      await sendBackupDM(anonNsecHex);
      toast({ title: 'Backup sent!', description: 'Check your Nostr DMs — encrypted, only you can read it.' });
    } catch {
      toast({ title: 'Backup failed', description: 'Make sure your signer supports NIP-44.' });
    }
  };

  const handleSaveLightningAddress = async () => {
    if (!anonNsecHex || !lightningAddress.trim()) return;
    const addr = lightningAddress.trim();
    if (!addr.includes('@')) {
      toast({ title: 'Invalid address', description: 'Enter a Lightning address like you@getalby.com' });
      return;
    }
    setSavingLn(true);
    try {
      const privkeyBytes = hexToBytes(anonNsecHex);
      const event = finalizeEvent(
        {
          kind: 0,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: JSON.stringify({ lud16: addr }),
        },
        privkeyBytes,
      );
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      toast({
        title: '⚡ Lightning address saved',
        description: 'Your CD recipients can now zap your anon identity to cover your postage.',
      });
      setLightningAddress('');
    } catch {
      toast({ title: 'Failed to save', description: 'Please try again.' });
    } finally {
      setSavingLn(false);
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

  if (!anonNsecHex || !anonPubkey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Anon Swap Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your Anon Swap Identity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Anon npub</p>
          <p className="font-mono text-xs break-all bg-muted p-2 rounded">{anonNpub}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Your browser has saved this key, and a backup has been sent to your Nostr DMs —
          check there if you ever switch devices.
        </p>

        {/* Lightning address for zaps */}
        <div className="space-y-2 pt-1 border-t border-border">
          <p className="text-xs font-medium">⚡ Add Lightning address</p>
          <p className="text-xs text-muted-foreground">
            Optional — lets your recipients zap you. For maximum privacy, use a fresh
            Lightning address not linked to your real identity.
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="you@getalby.com"
              value={lightningAddress}
              onChange={e => setLightningAddress(e.target.value)}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={handleSaveLightningAddress}
              disabled={savingLn || !lightningAddress.trim()}
            >
              {savingLn ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleBackup} disabled={isPending}>
            {isPending ? 'Sending…' : 'Re-send backup DM'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isPending}>
            Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
