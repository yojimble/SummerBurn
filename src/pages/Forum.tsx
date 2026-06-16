import { useSeoMeta } from '@unhead/react';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { Layout } from '@/components/Layout';
import { NewThreadDialog } from '@/components/NewThreadDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useThreads } from '@/hooks/useThreads';
import { useRSVPs } from '@/hooks/useRSVPs';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isPermittedPoster, ORGANIZER_PUBKEY } from '@/lib/summerBurn';

function timeAgo(ts: number): string {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function threadTitle(event: NostrEvent): string {
  const subject = event.tags.find(t => t[0] === 'subject')?.[1];
  if (subject) return subject;
  return event.content.slice(0, 80) + (event.content.length > 80 ? '…' : '');
}

function ThreadRow({ event }: { event: NostrEvent }) {
  const navigate = useNavigate();
  const { data } = useAuthor(event.pubkey);
  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(event.pubkey).slice(0, 12) + '…';
  const noteId = nip19.noteEncode(event.id);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/forum/${noteId}`)}
    >
      <CardContent className="px-4 py-3 flex items-start gap-3">
        <Avatar className="h-8 w-8 mt-0.5 shrink-0">
          <AvatarImage src={data?.metadata?.picture} alt={name} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-snug truncate">{threadTitle(event)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {name} · {timeAgo(event.created_at)}
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">→</span>
      </CardContent>
    </Card>
  );
}

const Forum = () => {
  useSeoMeta({ title: 'Forum — Bitcoin Summer Burn 2026' });

  const { user } = useCurrentUser();
  const { data: threads, isLoading: threadsLoading } = useThreads();
  const { data: rsvps, isLoading: rsvpsLoading } = useRSVPs();

  const isLoading = threadsLoading || rsvpsLoading;

  const posts =
    rsvps && rsvps.pubkeys.size > 0
      ? (threads ?? []).filter(e => rsvps.pubkeys.has(e.pubkey) || e.pubkey === ORGANIZER_PUBKEY)
      : (threads ?? []);

  const isRsvped = isPermittedPoster(user?.pubkey, rsvps?.pubkeys);

  return (
    <Layout>
      <div className="container max-w-2xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Forum</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Discussion for RSVPed Burners
            </p>
          </div>
          {isRsvped && <NewThreadDialog />}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="px-4 py-3 flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map(e => <ThreadRow key={e.id} event={e} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground space-y-3">
            <p className="text-5xl">💬</p>
            <p className="font-semibold text-lg text-foreground">No threads yet</p>
            {isRsvped ? (
              <p className="text-sm">Start the conversation!</p>
            ) : (
              <p className="text-sm">RSVP to join the forum.</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Forum;
