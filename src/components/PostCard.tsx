import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LikeButton } from '@/components/LikeButton';
import { ZapButton } from '@/components/ZapButton';
import { ReplyForm } from '@/components/ReplyForm';
import { useAuthor } from '@/hooks/useAuthor';
import { useThread } from '@/hooks/useThread';
import { useRSVPs } from '@/hooks/useRSVPs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isPermittedPoster } from '@/lib/summerBurn';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

const URL_REGEX = /https?:\/\/\S+/g;
const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp|avif)(\?\S*)?$/i;

function renderContent(content: string) {
  const parts = content.split(URL_REGEX);
  const urls = content.match(URL_REGEX) ?? [];

  return parts.flatMap((part, i) => {
    const url = urls[i];
    if (!url) return [part];
    if (IMAGE_EXT_REGEX.test(url)) {
      return [
        part,
        <img
          key={i}
          src={url}
          alt=""
          className="mt-2 rounded-md max-h-96 w-auto"
          loading="lazy"
        />,
      ];
    }
    return [
      part,
      <a
        key={i}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        {url}
      </a>,
    ];
  });
}

function timeAgo(ts: number): string {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ReplyBlock({ event }: { event: NostrEvent }) {
  const { data } = useAuthor(event.pubkey);
  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(event.pubkey).slice(0, 12) + '…';

  return (
    <div className="flex gap-2 pl-4 border-l-2 border-border">
      <Avatar className="h-6 w-6 shrink-0">
        <AvatarImage src={data?.metadata?.picture} alt={name} />
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-xs font-semibold">{name} <span className="text-muted-foreground font-normal">· {timeAgo(event.created_at)}</span></p>
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{event.content}</p>
      </div>
    </div>
  );
}

export function PostCard({ event }: { event: NostrEvent }) {
  const { data } = useAuthor(event.pubkey);
  const { user } = useCurrentUser();
  const { data: rsvps } = useRSVPs();
  const [showReplies, setShowReplies] = useState(false);
  const { data: thread } = useThread(showReplies ? event.id : '');

  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(event.pubkey).slice(0, 12) + '…';
  const picture = data?.metadata?.picture;
  const isRsvped = isPermittedPoster(user?.pubkey, rsvps?.pubkeys);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={picture} alt={name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-none truncate">{name}</p>
            <p className="text-xs text-muted-foreground mt-1">{timeAgo(event.created_at)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {renderContent(event.content)}
        </p>

        <div className="flex items-center gap-1 -mx-2">
          <LikeButton event={event} />
          <Button variant="ghost" size="sm" onClick={() => setShowReplies(v => !v)}>
            💬 {thread?.replies.length ?? (showReplies ? 0 : 'Reply')}
          </Button>
          <ZapButton pubkey={event.pubkey} label={name} event={event} compact />
        </div>

        {showReplies && (
          <div className="space-y-3 pt-2 border-t border-border">
            {thread?.replies.map(reply => (
              <ReplyBlock key={reply.id} event={reply} />
            ))}

            {isRsvped ? (
              <ReplyForm root={event} />
            ) : user ? (
              <p className="text-xs text-muted-foreground">RSVP to join the conversation.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Log in and RSVP to reply.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
