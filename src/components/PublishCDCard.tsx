import { useEffect, useRef, useState } from 'react';
import { finalizeEvent } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { X, ImageIcon } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCDListing } from '@/hooks/useCDListing';
import { useAnonIdentity } from '@/hooks/useAnonIdentity';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { toast } from '@/hooks/useToast';
import { hexToBytes } from '@/lib/utils';
import { HASHTAG, CD_LISTING_D_TAG, KIND_CD_LISTING } from '@/lib/summerBurn';
import type { NostrEvent } from '@nostrify/nostrify';

const MAX_IMAGES = 5;

function getTag(event: NostrEvent, name: string): string | undefined {
  return event.tags.find(([n]) => n === name)?.[1];
}

function getImages(event: NostrEvent): string[] {
  return event.tags.filter(([n]) => n === 'image').map(([, url]) => url);
}

function IdentityToggle({ anon, onChange, disabled }: { anon: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  return (
    <div className="flex rounded-md border border-border overflow-hidden text-xs w-fit">
      <button type="button" disabled={disabled} onClick={() => onChange(false)}
        className={`px-3 py-1.5 transition-colors ${!anon ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
        🌍 Public
      </button>
      <button type="button" disabled={disabled} onClick={() => onChange(true)}
        className={`px-3 py-1.5 transition-colors ${anon ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
        🥷 Anonymous
      </button>
    </div>
  );
}

export function PublishCDCard() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { anonNsecHex, anonPubkey } = useAnonIdentity();
  const [isAnon, setIsAnon] = useState(false);
  const activePubkey = isAnon && anonPubkey ? anonPubkey : user?.pubkey;
  const { data: listing, isLoading } = useCDListing(activePubkey);
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: publish, isPending: isPublishing } = useNostrPublish();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [tracklist, setTracklist] = useState('');
  const [runtime, setRuntime] = useState('');
  const [userTags, setUserTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>([]); // existing + newly-uploaded URLs
  const [offerExtraCopies, setOfferExtraCopies] = useState(false);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [showLnDialog, setShowLnDialog] = useState(false);
  const [lightningAddress, setLightningAddress] = useState('');
  const [savingLn, setSavingLn] = useState(false);

  const SUGGESTED_TAGS = [
    'rock', 'pop', 'jazz', 'electronic', 'folk', 'classical',
    'instrumental', 'live', 'acoustic', 'lo-fi',
  ];

  // Prefill from the existing listing once it loads.
  useEffect(() => {
    if (initialized) return;
    if (listing) {
      setTitle(getTag(listing, 'title') ?? '');
      setTracklist(listing.content ?? '');
      setImages(getImages(listing));
      setOfferExtraCopies(getTag(listing, 'status') === 'active');
      setPrice(listing.tags.find(([n]) => n === 'price')?.[1] ?? '');
      setQuantity(getTag(listing, 'quantity') ?? '');
      setRuntime(listing.tags.find(([n, k]) => n === 'spec' && k === 'runtime')?.[2] ?? '');
      setUserTags(listing.tags.filter(([n, v]) => n === 't' && v !== HASHTAG && v !== 'music' && v !== 'mixtape').map(([, v]) => v));
    }
    if (!isLoading) setInitialized(true);
  }, [listing, isLoading, initialized]);

  const isPending = isUploading || isPublishing;

  const handleFiles = async (files: FileList) => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast({ title: `You can only add up to ${MAX_IMAGES} images.` });
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    try {
      const uploaded = await Promise.all(
        toUpload.map(async (file) => {
          const tags = await uploadFile(file);
          return tags.find(([name]) => name === 'url')?.[1];
        }),
      );
      setImages((prev) => [...prev, ...uploaded.filter((u): u is string => !!u)]);
    } catch {
      toast({ title: 'Image upload failed', description: 'Please try again.' });
    }
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
  };

  const handlePublish = async () => {
    if (!title.trim() || images.length === 0) return;
    if (isAnon && !anonNsecHex) { toast({ title: 'Generate your anon identity first.' }); return; }
    try {
      const publishedAt = (listing && getTag(listing, 'published_at')) ?? String(Math.floor(Date.now() / 1000));

      const eventTags: string[][] = [
        ['d', CD_LISTING_D_TAG],
        ['title', title.trim()],
        ['t', HASHTAG],
        ['t', 'music'],
        ['t', 'mixtape'],
        ...userTags.map((t) => ['t', t]),
        ['published_at', publishedAt],
        ...images.map((url) => ['image', url]),
      ];
      if (runtime.trim()) eventTags.push(['spec', 'runtime', runtime.trim()]);
      if (offerExtraCopies) {
        eventTags.push(['status', 'active']);
        if (price.trim()) eventTags.push(['price', price.trim(), 'sats']);
        if (quantity.trim()) eventTags.push(['quantity', quantity.trim()]);
      }

      if (isAnon && anonNsecHex) {
        const event = finalizeEvent(
          { kind: KIND_CD_LISTING, content: tracklist.trim(), tags: eventTags, created_at: Math.floor(Date.now() / 1000) },
          hexToBytes(anonNsecHex),
        );
        await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      } else {
        await publish({ kind: KIND_CD_LISTING, content: tracklist.trim(), tags: eventTags });
      }

      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-listing', activePubkey ?? ''] });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-listings'] });
      toast({ title: 'CD listing published!' });
      if (isAnon) setShowLnDialog(true);
    } catch {
      toast({ title: 'Failed to publish', description: 'Please try again.' });
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
      const event = finalizeEvent(
        { kind: 0, created_at: Math.floor(Date.now() / 1000), tags: [], content: JSON.stringify({ lud16: addr }) },
        hexToBytes(anonNsecHex),
      );
      await nostr.event(event, { signal: AbortSignal.timeout(5000) });
      toast({ title: '⚡ Lightning address saved', description: 'Recipients can now zap your anon identity.' });
      setShowLnDialog(false);
      setLightningAddress('');
    } catch {
      toast({ title: 'Failed to save', description: 'Please try again.' });
    } finally {
      setSavingLn(false);
    }
  };

  return (
    <>
    <Dialog open={showLnDialog} onOpenChange={setShowLnDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>⚡ Add a Lightning address</DialogTitle>
          <DialogDescription>
            Your CD is published anonymously. Add a Lightning address to your anon identity so
            recipients can zap you. For maximum privacy, use a fresh address not linked to your
            real identity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <Input
            type="text"
            placeholder="you@getalby.com"
            value={lightningAddress}
            onChange={(e) => setLightningAddress(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowLnDialog(false)}>Skip</Button>
            <Button onClick={handleSaveLightningAddress} disabled={savingLn || !lightningAddress.trim()}>
              {savingLn ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <Card>
      <CardHeader><CardTitle className="text-base">📀 Publish Your CD</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              List your CD here. Show it off in the Gallery and optionally offer extra copies to
              anyone outside the swap who's happy to cover postage.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="cd-title">Title</Label>
              <Input
                id="cd-title"
                placeholder="e.g. Sun-Drenched Sounds Vol. 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cd-tracklist">Tracklist</Label>
              <Textarea
                id="cd-tracklist"
                placeholder={'1. Artist - Track\n2. Artist - Track\n...'}
                value={tracklist}
                onChange={(e) => setTracklist(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cd-runtime">Total runtime</Label>
              <Input
                id="cd-runtime"
                placeholder="e.g. 74:32"
                value={runtime}
                onChange={(e) => setRuntime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {[HASHTAG, 'music', 'mixtape'].map((t) => (
                  <span key={t} className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                    #{t}
                  </span>
                ))}
                {userTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setUserTags((prev) => prev.filter((x) => x !== t))}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs hover:bg-destructive/20 hover:text-destructive transition-colors"
                  >
                    #{t} <X className="h-2.5 w-2.5" />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9&-]/g, ''))}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                      e.preventDefault();
                      const t = tagInput.trim();
                      if (t !== HASHTAG && !userTags.includes(t)) setUserTags((prev) => [...prev, t]);
                      setTagInput('');
                    }
                  }}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.filter((s) => !userTags.includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setUserTags((prev) => [...prev, s])}
                    className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground transition-colors"
                  >
                    #{s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Images ({images.length}/{MAX_IMAGES})</Label>
              <div className="flex flex-wrap gap-2">
                {images.map((url) => (
                  <div key={url} className="relative h-20 w-20 rounded-md overflow-hidden bg-muted shrink-0">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={isUploading}
                    className="h-20 w-20 rounded-md border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/60 transition-colors shrink-0"
                  >
                    {isUploading ? '…' : <ImageIcon className="h-6 w-6" />}
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </div>
              <p className="text-xs text-muted-foreground">First image is the main image shown in the Gallery.</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="cd-extra">Offer extra copies to non-swappers</Label>
                <p className="text-xs text-muted-foreground">
                  On: listed as for sale at the price and quantity you set below. Off: shown
                  in the Gallery only.
                </p>
              </div>
              <Switch id="cd-extra" checked={offerExtraCopies} onCheckedChange={setOfferExtraCopies} />
            </div>

            {offerExtraCopies && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cd-price">Price (sats)</Label>
                  <Input
                    id="cd-price"
                    type="number"
                    min={0}
                    placeholder="e.g. 5000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cd-quantity">Quantity available</Label>
                  <Input
                    id="cd-quantity"
                    type="number"
                    min={0}
                    placeholder="e.g. 3"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>
            )}

            {anonPubkey && <IdentityToggle anon={isAnon} onChange={setIsAnon} disabled={isPending} />}

            <Button
              className="w-full"
              disabled={isPending || !title.trim() || images.length === 0}
              onClick={handlePublish}
            >
              {isUploading ? 'Uploading images…' : isPublishing ? 'Publishing…' : listing ? 'Update listing' : 'Publish CD'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
    </>
  );
}
