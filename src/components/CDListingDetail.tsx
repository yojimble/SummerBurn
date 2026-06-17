import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { DMSellerDialog } from '@/components/DMSellerDialog';
import { CDStarWidget } from '@/components/CDReviews';
import { CDComments } from '@/components/CDComments';
import { useAuthor } from '@/hooks/useAuthor';
import { useCDListing } from '@/hooks/useCDListing';
import type { NostrEvent } from '@nostrify/nostrify';

function getTag(event: NostrEvent, name: string): string | undefined {
  return event.tags.find(([n]) => n === name)?.[1];
}

function getImages(event: NostrEvent): string[] {
  return event.tags.filter(([n]) => n === 'image').map(([, url]) => url);
}

export function CDListingDetail({ pubkey }: { pubkey: string }) {
  const { data: listing, isLoading } = useCDListing(pubkey);
  const { data: author } = useAuthor(pubkey);

  const name =
    author?.metadata?.display_name ??
    author?.metadata?.name ??
    nip19.npubEncode(pubkey).slice(0, 12) + '…';

  useSeoMeta({
    title: listing ? `${getTag(listing, 'title')} — Bitcoin Summer Burn 2026` : 'CD Listing',
  });

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8 space-y-4">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!listing) {
    return <p className="text-muted-foreground text-center py-20">Listing not found.</p>;
  }

  const title = getTag(listing, 'title') ?? 'Untitled CD';
  const images = getImages(listing);
  const offersExtraCopies = getTag(listing, 'status') === 'active';
  const price = listing.tags.find(([n]) => n === 'price')?.[1];
  const quantity = getTag(listing, 'quantity');
  const runtime = listing.tags.find(([n, k]) => n === 'spec' && k === 'runtime')?.[2];

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: image + title/author */}
        <div className="md:w-1/2 shrink-0 space-y-4">
          {images.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((url) => (
                  <CarouselItem key={url}>
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={url} alt={title} className="w-full h-full object-cover" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious />
                  <CarouselNext />
                </>
              )}
            </Carousel>
          ) : (
            <div className="aspect-square rounded-lg bg-muted" />
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{title}</h1>
            <CDStarWidget sellerPubkey={pubkey} />
            <Link to={`/${nip19.npubEncode(pubkey)}`} className="flex items-center gap-2 w-fit">
              <Avatar className="h-7 w-7">
                <AvatarImage src={author?.metadata?.picture} alt={name} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{name}</span>
            </Link>
          </div>
        </div>

        {/* Right: tracklist + purchase card */}
        <div className="flex-1 space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tracklist</h2>
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{listing.content}</p>
            {runtime && <p className="mt-2 text-sm text-muted-foreground">Total runtime: {runtime}</p>}
          </div>

          {offersExtraCopies && (
            <Card>
              <CardContent className="px-4 py-0 space-y-2">
                <div className="flex items-center gap-3 text-sm font-medium">
                  {offersExtraCopies && <Badge>📬 Extra copies available</Badge>}
                  {price && (
                    <span className="text-primary">
                      ⚡ {Number(price).toLocaleString()} sats{' '}
                      <span className="text-muted-foreground font-normal">+ postage</span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {name} is offering extra copies of this CD to anyone outside the swap.
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">DM to purchase</p>
                  <DMSellerDialog recipientPubkey={pubkey} recipientName={name} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CDComments sellerPubkey={pubkey} />
    </div>
  );
}
