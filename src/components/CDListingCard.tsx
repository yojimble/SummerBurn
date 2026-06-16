import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAuthor } from '@/hooks/useAuthor';
import { KIND_CD_LISTING, CD_LISTING_D_TAG } from '@/lib/summerBurn';
import type { NostrEvent } from '@nostrify/nostrify';

function getTag(event: NostrEvent, name: string): string | undefined {
  return event.tags.find(([n]) => n === name)?.[1];
}

export function CDListingCard({ event }: { event: NostrEvent }) {
  const { data } = useAuthor(event.pubkey);
  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(event.pubkey).slice(0, 12) + '…';
  const picture = data?.metadata?.picture;
  const title = getTag(event, 'title') ?? 'Untitled CD';
  const mainImage = getTag(event, 'image');
  const offersExtraCopies = getTag(event, 'status') === 'active';

  const naddr = nip19.naddrEncode({
    kind: KIND_CD_LISTING,
    pubkey: event.pubkey,
    identifier: CD_LISTING_D_TAG,
  });

  if (!mainImage) return null;

  return (
    <Link to={`/${naddr}`}>
      <Card className="overflow-hidden group cursor-pointer aspect-square relative">
        <img
          src={mainImage}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {offersExtraCopies && (
          <Badge className="absolute top-2 right-2">📬 Extra copies</Badge>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 space-y-1">
          <p className="text-xs font-semibold text-white truncate">{title}</p>
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5 flex-shrink-0 border border-white/40">
              <AvatarImage src={picture} alt={name} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-white/80 truncate">{name}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
