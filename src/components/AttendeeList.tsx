import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

function Attendee({ pubkey }: { pubkey: string }) {
  const { data } = useAuthor(pubkey);
  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(pubkey).slice(0, 12) + '…';
  const picture = data?.metadata?.picture;

  return (
    <div className="flex flex-col items-center gap-1 w-16" title={name}>
      <Avatar className="h-10 w-10 ring-2 ring-background">
        <AvatarImage src={picture} alt={name} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-xs text-muted-foreground text-center truncate w-full leading-tight">
        {name}
      </span>
    </div>
  );
}

interface AttendeeListProps {
  events: NostrEvent[];
  count: number;
}

export function AttendeeList({ events, count }: AttendeeListProps) {
  const shown = events.slice(0, 24);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        {count} {count === 1 ? 'Burner' : 'Burners'} signed up
      </h3>
      <div className="flex flex-wrap gap-4">
        {shown.map((e) => (
          <Attendee key={e.pubkey} pubkey={e.pubkey} />
        ))}
        {count > 24 && (
          <div className="flex flex-col items-center justify-center w-16">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
              +{count - 24}
            </div>
            <span className="text-xs text-muted-foreground mt-1">more</span>
          </div>
        )}
      </div>
    </div>
  );
}
