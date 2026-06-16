import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { X, ImageIcon } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCDListing } from '@/hooks/useCDListing';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { toast } from '@/hooks/useToast';
import { HASHTAG, CD_LISTING_D_TAG, KIND_CD_LISTING } from '@/lib/summerBurn';
import type { NostrEvent } from '@nostrify/nostrify';

const MAX_IMAGES = 5;

function getTag(event: NostrEvent, name: string): string | undefined {
  return event.tags.find(([n]) => n === name)?.[1];
}

function getImages(event: NostrEvent): string[] {
  return event.tags.filter(([n]) => n === 'image').map(([, url]) => url);
}

export function PublishCDCard() {
  const { user } = useCurrentUser();
  const { data: listing, isLoading } = useCDListing(user?.pubkey);
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: publish, isPending: isPublishing } = useNostrPublish();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [tracklist, setTracklist] = useState('');
  const [images, setImages] = useState<string[]>([]); // existing + newly-uploaded URLs
  const [offerExtraCopies, setOfferExtraCopies] = useState(false);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [initialized, setInitialized] = useState(false);

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
    try {
      const publishedAt = (listing && getTag(listing, 'published_at')) ?? String(Math.floor(Date.now() / 1000));

      const tags: string[][] = [
        ['d', CD_LISTING_D_TAG],
        ['title', title.trim()],
        ['t', HASHTAG],
        ['published_at', publishedAt],
        ...images.map((url) => ['image', url]),
      ];
      if (offerExtraCopies) {
        tags.push(['status', 'active']);
        if (price.trim()) tags.push(['price', price.trim(), 'sats']);
        if (quantity.trim()) tags.push(['quantity', quantity.trim()]);
      }

      await publish({ kind: KIND_CD_LISTING, content: tracklist.trim(), tags });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-listing', user?.pubkey ?? ''] });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-listings'] });
      toast({ title: 'CD listing published!' });
    } catch {
      toast({ title: 'Failed to publish', description: 'Please try again.' });
    }
  };

  return (
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
  );
}
