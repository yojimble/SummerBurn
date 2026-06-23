import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useSeoMeta } from '@unhead/react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { NostrEmbed } from '@/components/NostrEmbed';
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

function ArticlePage({ kind, pubkey, identifier }: { kind: number; pubkey: string; identifier: string }) {
  const { nostr } = useNostr();
  const { data: author } = useAuthor(pubkey);

  const { data: event, isLoading } = useQuery<NostrEvent | null>({
    queryKey: ['naddr', kind, pubkey, identifier],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const [ev] = await nostr.query(
        [{ kinds: [kind], authors: [pubkey], '#d': [identifier], limit: 1 }],
        { signal },
      );
      return ev ?? null;
    },
    staleTime: 300000,
  });

  const title = event?.tags.find(([t]) => t === 'title')?.[1] ?? 'Article';
  const image = event?.tags.find(([t]) => t === 'image')?.[1];
  const summary = event?.tags.find(([t]) => t === 'summary')?.[1];
  const publishedAt = event?.tags.find(([t]) => t === 'published_at')?.[1];
  const name =
    author?.metadata?.display_name ??
    author?.metadata?.name ??
    nip19.npubEncode(pubkey).slice(0, 12) + '…';

  useSeoMeta({ title: `${title} — Bitcoin Summer Burn 2026`, description: summary });

  const date = publishedAt
    ? new Date(Number(publishedAt) * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : event
    ? new Date(event.created_at * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <Layout>
      <div className="container max-w-2xl py-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="space-y-2 pt-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          </div>
        ) : !event ? (
          <p className="text-muted-foreground text-center py-20">Article not found.</p>
        ) : (
          <article className="space-y-6">
            {image && (
              <img src={image} alt={title} className="w-full max-h-72 object-cover rounded-lg" />
            )}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold leading-tight">{title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={author?.metadata?.picture} alt={name} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{name}</span>
                {date && <><span>·</span><span>{date}</span></>}
              </div>
              {summary && <p className="text-muted-foreground leading-relaxed">{summary}</p>}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkBreaks]}
                urlTransform={(url) => url}
                components={{
                  a({ href, children }) {
                    if (href?.startsWith('nostr:')) {
                      return <NostrEmbed uri={href} />;
                    }
                    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                  },
                  p({ children }) {
                    // Check if child is a plain nostr: URI text node
                    if (typeof children === 'string' && children.startsWith('nostr:')) {
                      return <NostrEmbed uri={children} />;
                    }
                    return <p>{children}</p>;
                  },
                }}
              >
                {/* Pre-process plain nostr: URIs into markdown links so ReactMarkdown picks them up */}
                {event.content.replace(/(^|\s)(nostr:[a-zA-Z0-9]+)/g, '$1[$2]($2)')}
              </ReactMarkdown>
            </div>
          </article>
        )}
      </div>
    </Layout>
  );
}

function SingleNotePage({ eventId }: { eventId: string }) {
  const { nostr } = useNostr();

  const { data: event, isLoading } = useQuery<NostrEvent | null>({
    queryKey: ['note', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const [ev] = await nostr.query([{ kinds: [1], ids: [eventId], limit: 1 }], { signal });
      return ev ?? null;
    },
    staleTime: 300000,
  });

  useSeoMeta({ title: 'Note — Bitcoin Summer Burn 2026' });

  return (
    <Layout>
      <div className="container max-w-2xl py-8">
        {isLoading ? (
          <Card><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
        ) : event ? (
          <PostCard event={event} />
        ) : (
          <p className="text-muted-foreground text-center py-20">Note not found.</p>
        )}
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
      return <SingleNotePage eventId={decoded.data} />;

    case 'nevent':
      return <SingleNotePage eventId={decoded.data.id} />;

    case 'naddr':
      if (decoded.data.kind === KIND_CD_LISTING) {
        return (
          <Layout>
            <CDListingDetail pubkey={decoded.data.pubkey} />
          </Layout>
        );
      }
      return (
        <ArticlePage
          kind={decoded.data.kind}
          pubkey={decoded.data.pubkey}
          identifier={decoded.data.identifier}
        />
      );

    default:
      return <NotFound />;
  }
} 