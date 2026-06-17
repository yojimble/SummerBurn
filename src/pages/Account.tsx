import { useSeoMeta } from '@unhead/react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { finalizeEvent, getPublicKey } from 'nostr-tools';
import { wrapEvent } from 'nostr-tools/nip59';
import { SimplePool } from 'nostr-tools/pool';
import { useNostr } from '@nostrify/react';
import { Layout } from '@/components/Layout';
import { AnonIdentityCard } from '@/components/AnonIdentityCard';
import { CDPostedButton } from '@/components/CDPostedButton';
import { AnonZapButton } from '@/components/AnonZapButton';
import { PostageReceiptUpload } from '@/components/PostageReceiptUpload';
import { PublishCDCard } from '@/components/PublishCDCard';
import { RSVPButton } from '@/components/RSVPButton';
import { CDReceivedButton } from '@/components/CDReceivedButton';
import { OrganizerTools } from '@/components/OrganizerTools';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAnonIdentity } from '@/hooks/useAnonIdentity';
import { useMyMatch } from '@/hooks/useMyMatch';
import { useAddressDMs } from '@/hooks/useAddressDMs';
import { useSenderStatus } from '@/hooks/useSenderStatus';
import { usePostageReceipts } from '@/hooks/usePostageReceipts';
import { toast } from '@/hooks/useToast';
import { hexToBytes } from '@/lib/utils';
import { nip19 } from 'nostr-tools';
import { ORGANIZER_PUBKEY, DM_RELAYS } from '@/lib/summerBurn';

const Account = () => {
  useSeoMeta({ title: 'My Account — Bitcoin Summer Burn 2026' });

  const { user, metadata } = useCurrentUser();
  const { anonNsecHex, anonPubkey } = useAnonIdentity();
  const { data: match, isLoading: matchLoading } = useMyMatch();

  // Senders read address DMs at their anon pubkey, sent by recipients' anon pubkeys
  const { data: addressDMs, isLoading: dmsLoading } = useAddressDMs(
    match?.sendingTo ?? [],
    anonPubkey,
    anonNsecHex,
  );

  // Postage receipt images published by senders
  const { data: senderPosted } = useSenderStatus(match?.receivingFrom ?? []);

  const { data: postageReceipts } = usePostageReceipts(
    match?.receivingFrom ?? [],
    anonPubkey,
  );

  const { nostr } = useNostr();
  const [myAddress, setMyAddress] = useState('');
  const [addressSent, setAddressSent] = useState(false);
  const [sendingAddress, setSendingAddress] = useState(false);

  const handleSendAddress = async () => {
    if (!anonNsecHex || !match?.receivingFrom.length || !myAddress.trim()) return;
    setSendingAddress(true);
    try {
      const privkeyBytes = hexToBytes(anonNsecHex);
      const pool = new SimplePool();
      await Promise.all(match.receivingFrom.map(async (recipientAnonPubkey) => {
        const wrap = wrapEvent(
          { kind: 14, content: myAddress.trim(), tags: [['p', recipientAnonPubkey]], created_at: Math.floor(Date.now() / 1000) },
          privkeyBytes,
          recipientAnonPubkey,
        );
        await Promise.any(pool.publish(DM_RELAYS, wrap));
      }));
      pool.close(DM_RELAYS);
      setAddressSent(true);
      setMyAddress('');
      toast({ title: '📬 Address sent!', description: 'Your Burn group now know where to send your CD.' });
    } catch {
      toast({ title: 'Failed to send', description: 'Please try again.' });
    } finally {
      setSendingAddress(false);
    }
  };

  if (!user) return <Navigate to="/" replace />;

  const displayName =
    metadata?.display_name ??
    metadata?.name ??
    nip19.npubEncode(user.pubkey).slice(0, 12) + '…';

  const matchesPublished = !!ORGANIZER_PUBKEY && (matchLoading || !!match);

  return (
    <Layout>
      <div className="container max-w-2xl py-8 space-y-6">

        {/* Profile */}
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{displayName}</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {nip19.npubEncode(user.pubkey).slice(0, 20)}…
            </p>
          </div>
        </div>

        {/* RSVP */}
        <Card>
          <CardHeader><CardTitle className="text-base">RSVP Status</CardTitle></CardHeader>
          <CardContent><RSVPButton /></CardContent>
        </Card>

        {/* Anon identity */}
        <AnonIdentityCard />

        {/* CD Partners */}
        <Card>
          <CardHeader><CardTitle className="text-base">Your CD Partners</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {!matchesPublished ? (
              <p className="text-sm text-muted-foreground">
                Matches haven't been published yet — check back after the sign-up window closes.
              </p>
            ) : matchLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : match ? (
              <>
                {/* Senders posting to you — send them your address */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Someone's posting you a CD
                  </p>
                  {!anonNsecHex ? (
                    <p className="text-sm text-amber-600">
                      Generate your anon identity above before sending your address.
                    </p>
                  ) : addressSent ? (
                    <p className="text-sm text-green-600">✓ Your address has been sent to your Burn group.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Enter your postal address — it'll be sent anonymously to everyone in your group.
                      </p>
                      <Textarea
                        placeholder={'Your Name\n123 Street\nCity\nPostcode\nCountry'}
                        value={myAddress}
                        onChange={e => setMyAddress(e.target.value)}
                        rows={5}
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={handleSendAddress}
                        disabled={sendingAddress || !myAddress.trim()}
                        className="w-full"
                      >
                        {sendingAddress ? 'Sending…' : `Send my address to my Burn group`}
                      </Button>
                    </div>
                  )}
                  {match.receivingFrom.map((senderAnonPubkey) => {
                    const hasPosted = senderPosted?.has(senderAnonPubkey);
                    return (
                      <div key={senderAnonPubkey} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              Burner <span className="font-mono">{nip19.npubEncode(senderAnonPubkey).slice(5, 13)}</span>
                            </p>
                            {hasPosted && (
                              <p className="text-xs text-green-600 font-medium mt-0.5">📬 CD posted!</p>
                            )}
                          </div>
                          <AnonZapButton anonPubkey={senderAnonPubkey} label={`Burner ${nip19.npubEncode(senderAnonPubkey).slice(5, 13)}`} />
                        </div>
                          {postageReceipts?.[senderAnonPubkey] && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground font-medium">📬 Proof of postage:</p>
                              <img
                                src={postageReceipts[senderAnonPubkey]}
                                alt="Postage receipt"
                                className="rounded-lg w-full max-h-48 object-contain bg-muted"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Recipients you're posting to — waiting for their address */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    You're posting to
                  </p>
                  {dmsLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : match.sendingTo.map((recipientAnonPubkey) => {
                    const address = addressDMs?.[recipientAnonPubkey];
                    return (
                      <div key={recipientAnonPubkey} className="rounded-lg border p-3 space-y-2">
                        <p className="text-sm font-medium">
                          Burner <span className="font-mono">{nip19.npubEncode(recipientAnonPubkey).slice(5, 13)}</span>
                        </p>
                        {address ? (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <p className="text-xs text-green-600 font-medium">✓ Address received — post their CD here:</p>
                              <pre className="text-sm whitespace-pre-wrap bg-muted rounded p-2">{address}</pre>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Proof of postage</p>
                              <PostageReceiptUpload
                                recipientAnonPubkey={recipientAnonPubkey}
                                anonNsecHex={anonNsecHex ?? ''}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Waiting for their address…
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* CD Dispatch */}
        <Card>
          <CardHeader><CardTitle className="text-base">CD Dispatch</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Once you've posted all three CDs, mark them as sent. Try to get them in the post
              within two weeks of July 21st.
            </p>
            <CDPostedButton />
          </CardContent>
        </Card>

        {/* CD Received */}
        <Card>
          <CardHeader><CardTitle className="text-base">CD Delivery</CardTitle></CardHeader>
          <CardContent>
            <CDReceivedButton />
          </CardContent>
        </Card>

        {/* Organiser tools — only visible to the organiser */}
        {user.pubkey === ORGANIZER_PUBKEY && <OrganizerTools />}

        {/* Publish CD listing */}
        <PublishCDCard />

      </div>
    </Layout>
  );
};

export default Account;
