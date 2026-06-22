import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useSeoMeta } from '@unhead/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { Layout } from '@/components/Layout';
import { CDListingDetail } from '@/components/CDListingDetail';
import { PostCard } from '@/components/PostCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { useRSVPs } from '@/hooks/useRSVPs';
import { useCDListing } from '@/hooks/useCDListing';
import { KIND_CD_LISTING, HASHTAG, FORUM_TAG } from '@/lib/summerBurn';
import NotFound from './NotFound';

function ProfilePage({ pubkey }: { pubkey: string }) {
  const { data: author, isLoading: authorLoading } = useAuthor(pubkey);
  const { data: rsvps } = useRSVPs();
  const { data: listing } = useCDListing(pubkey);
  const { nostr } = useNostr();

  const displayName =
    author?.metadata?.display_name ??
    author?.metadata?.name ??
    nip19.npubEncode(pubkey).slice(0, 12) + '…';

  useSeoMeta({ title: `${displayName} — Bitcoin Summer Burn 2026` });

  const { data: posts, isLoading: postsLoading } = useQuery<NostrEvent[]>({
    queryKey: ['summerburn', 'author-posts', pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const events = await nostr.query(
        [{ kinds: [1], authors: [pubkey], '#t': [HASHTAG], limit: 50 }],
        { signal },
      );
      return events
        .filter((e) => {
          const hasETag = e.tags.some(([n]) => n === 'e');
          const isForumTag = e.tags.some(([n, v]) => n === 't' && v === FORUM_TAG);
          return !hasETag && !isForumTag;
        })
        .sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 30000,
  });

  const isRsvped = rsvps?.pubkeys.has(pubkey);

  return (
    <Layout>
      <div className="container max-w-2xl py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          {authorLoading ? (
            <>
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </>
          ) : (
            <>
              <Avatar className="h-14 w-14">
                <AvatarImage src={author?.metadata?.picture} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold truncate">{displayName}</h1>
                {author?.metadata?.about && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {author.metadata.about}
                  </p>
                )}
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {nip19.npubEncode(pubkey).slice(0, 20)}…
                </p>
              </div>
            </>
          )}
        </div>

        {/* RSVP badge */}
        {isRsvped && (
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-sm font-medium">🔥 Signed up for Summer Burn</p>
            </CardContent>
          </Card>
        )}

        {/* CD listing */}
        {listing && (
          <CDListingDetail pubkey={pubkey} />
        )}

        {/* Their Summer Burn posts */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Summer Burn Posts
          </h2>
          {postsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            posts.map((post) => <PostCard key={post.id} event={post} />)
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No Summer Burn posts yet.
            </p>
          )}
        </div>

      </div>
    </Layout>
  );
}

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type } = decoded;

  switch (type) {
    case 'npub':
    case 'nprofile': {
      const pubkey = type === 'npub' ? decoded.data : decoded.data.pubkey;
      return <ProfilePage pubkey={pubkey} />;
    }

    case 'note':
      // AI agent should implement note view here
      return <div>Note placeholder</div>;

    case 'nevent':
      // AI agent should implement event view here
      return <div>Event placeholder</div>;

    case 'naddr':
      if (decoded.data.kind === KIND_CD_LISTING) {
        return (
          <Layout>
            <CDListingDetail pubkey={decoded.data.pubkey} />
          </Layout>
        );
      }
      return <div>Addressable event placeholder</div>;

    default:
      return <NotFound />;
  }
} 