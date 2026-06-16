import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { PostCard } from '@/components/PostCard';
import { useFeed } from '@/hooks/useFeed';
import { useRSVPs } from '@/hooks/useRSVPs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HASHTAG } from '@/lib/summerBurn';

const Feed = () => {
  useSeoMeta({
    title: 'Feed — Bitcoin Summer Burn 2026',
    description: `Nostr posts tagged #${HASHTAG} from RSVPed participants.`,
  });

  const { data: allPosts, isLoading: postsLoading } = useFeed();
  const { data: rsvps, isLoading: rsvpsLoading } = useRSVPs();

  const isLoading = postsLoading || rsvpsLoading;

  // Only show posts from RSVPed users
  const posts =
    rsvps && rsvps.pubkeys.size > 0
      ? (allPosts ?? []).filter((p) => rsvps.pubkeys.has(p.pubkey))
      : (allPosts ?? []);

  return (
    <Layout>
      <div className="container max-w-2xl py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Community Feed</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Posts tagged{' '}
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">#{HASHTAG}</code>{' '}
            from RSVPed Burners
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} event={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground space-y-3">
            <p className="text-5xl">🎵</p>
            <p className="font-semibold text-lg text-foreground">No posts yet</p>
            <p className="text-sm max-w-xs mx-auto">
              RSVP and post on Nostr with{' '}
              <strong>#{HASHTAG}</strong> to appear here!
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Feed;
