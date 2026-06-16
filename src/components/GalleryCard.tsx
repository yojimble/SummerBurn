import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthor } from '@/hooks/useAuthor';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

function getImageUrl(event: NostrEvent): string | undefined {
  return event.tags.find(([name]) => name === 'url')?.[1];
}

export function GalleryCard({ event }: { event: NostrEvent }) {
  const { data } = useAuthor(event.pubkey);
  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(event.pubkey).slice(0, 12) + '…';
  const picture = data?.metadata?.picture;
  const imageUrl = getImageUrl(event);

  if (!imageUrl) return null;

  return (
    <Card className="overflow-hidden group cursor-pointer">
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={event.content || 'Bitcoin Summer Burn artwork'}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={picture} alt={name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">{name}</span>
        </div>
        {event.content && (
          <p className="text-xs mt-1.5 text-foreground line-clamp-2 leading-snug">
            {event.content}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
