import { useSeoMeta } from '@unhead/react';
import { useParams, useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { Layout } from '@/components/Layout';
import { ReplyForm } from '@/components/ReplyForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useThread } from '@/hooks/useThread';
import { useRSVPs } from '@/hooks/useRSVPs';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function timeAgo(ts: number): string {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PostBlock({ event, isRoot = false }: { event: NostrEvent; isRoot?: boolean }) {
  const { data } = useAuthor(event.pubkey);
  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(event.pubkey).slice(0, 12) + '…';

  return (
    <div className={`flex gap-3 ${isRoot ? '' : 'pl-4 border-l-2 border-border'}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={data?.metadata?.picture} alt={name} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-sm">{name}</span>
          <span className="text-xs text-muted-foreground">{timeAgo(event.created_at)}</span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{event.content}</p>
      </div>
    </div>
  );
}

const ForumThread = () => {
  useSeoMeta({ title: 'Thread — Bitcoin Summer Burn 2026' });

  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { data: rsvps } = useRSVPs();

  const rootId = (() => {
    if (!noteId) return '';
    try {
      const decoded = nip19.decode(noteId);
      return decoded.type === 'note' ? decoded.data : '';
    } catch {
      return noteId; // assume raw hex
    }
  })();

  const { data, isLoading } = useThread(rootId);
  const isRsvped = user && rsvps?.pubkeys.has(user.pubkey);
  const subject = data?.root?.tags.find(t => t[0] === 'subject')?.[1];

  return (
    <Layout>
      <div className="container max-w-2xl py-8 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/forum')} className="-ml-2">
          ← Back to forum
        </Button>

        {isLoading ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </CardContent>
          </Card>
        ) : !data?.root ? (
          <p className="text-muted-foreground text-center py-20">Thread not found.</p>
        ) : (
          <Card>
            <CardContent className="px-4 py-4 space-y-5">
              {subject && (
                <h1 className="text-xl font-bold">{subject}</h1>
              )}

              {/* Root post */}
              <PostBlock event={data.root} isRoot />

              {/* Replies */}
              {data.replies.length > 0 && (
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    {data.replies.length} {data.replies.length === 1 ? 'reply' : 'replies'}
                  </p>
                  {data.replies.map(reply => (
                    <PostBlock key={reply.id} event={reply} />
                  ))}
                </div>
              )}

              {/* Reply form */}
              {isRsvped ? (
                <ReplyForm root={data.root} />
              ) : user ? (
                <p className="text-sm text-muted-foreground pt-4 border-t border-border">
                  RSVP to join the conversation.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground pt-4 border-t border-border">
                  Log in and RSVP to reply.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ForumThread;
