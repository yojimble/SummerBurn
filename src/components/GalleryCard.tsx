import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { useAuthor } from '@/hooks/useAuthor';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

const VIDEO_EXT_REGEX = /\.(mp4|webm|ogg|mov)(\?\S*)?$/i;

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
    <Card className="overflow-hidden group cursor-pointer aspect-square relative">
      {VIDEO_EXT_REGEX.test(imageUrl) ? (
        <video
          src={imageUrl}
          muted
          loop
          playsInline
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <img
          src={imageUrl}
          alt={event.content || 'Bitcoin Summer Burn artwork'}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex items-center gap-1.5">
        <Avatar className="h-5 w-5 flex-shrink-0 border border-white/40">
          <AvatarImage src={picture} alt={name} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-white truncate">{name}</span>
      </div>
    </Card>
  );
}
