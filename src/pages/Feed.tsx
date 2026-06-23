import { useSeoMeta } from '@unhead/react';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { PostCard } from '@/components/PostCard';
import { useFeed } from '@/hooks/useFeed';
import { useRSVPs } from '@/hooks/useRSVPs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { toast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImagePlus, X } from 'lucide-react';
import { HASHTAG, ORGANIZER_PUBKEY, isPermittedPoster } from '@/lib/summerBurn';

const Feed = () => {
  useSeoMeta({
    title: 'Feed — Bitcoin Summer Burn 2026',
    description: `Nostr posts tagged #${HASHTAG} from RSVPed participants.`,
  });

  const { data: allPosts, isLoading: postsLoading } = useFeed();
  const { data: rsvps, isLoading: rsvpsLoading } = useRSVPs();
  const { user } = useCurrentUser();
  const { mutateAsync: publish, isPending: isPosting } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const queryClient = useQueryClient();
  const [postContent, setPostContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = postsLoading || rsvpsLoading;
  const canPost = isPermittedPoster(user?.pubkey, rsvps?.pubkeys);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    try {
      const tags = await uploadFile(file);
      const url = tags.find(([name]) => name === 'url')?.[1];
      if (!url) throw new Error('No URL returned');
      setImageUrl(url);
    } catch {
      toast({ title: 'Image upload failed', description: 'Please try again.' });
      setImagePreview(null);
    }
    e.target.value = '';
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageUrl(null);
  };

  const handlePost = async () => {
    if (!postContent.trim() && !imageUrl) return;
    try {
      const content = imageUrl
        ? postContent.trim() ? `${postContent.trim()}\n\n${imageUrl}` : imageUrl
        : postContent.trim();
      await publish({ kind: 1, content, tags: [['t', HASHTAG]] });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'feed'] });
      toast({ title: 'Posted!' });
      setPostContent('');
      clearImage();
    } catch {
      toast({ title: 'Failed to post', description: 'Please try again.' });
    }
  };

  // Only show posts from RSVPed users (plus the organiser, who isn't RSVPed)
  const posts =
    rsvps && rsvps.pubkeys.size > 0
      ? (allPosts ?? []).filter((p) => rsvps.pubkeys.has(p.pubkey) || p.pubkey === ORGANIZER_PUBKEY)
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

        {canPost && (
          <div className="mb-6 space-y-2">
            <Textarea
              placeholder="What's on your mind?"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {imagePreview && (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-48 rounded-lg border border-border object-cover" />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                    <span className="text-xs text-muted-foreground">Uploading…</span>
                  </div>
                )}
                {!isUploading && (
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || !!imagePreview}
                >
                  <ImagePlus className="h-4 w-4 mr-1" />
                  Image
                </Button>
              </div>
              <Button
                onClick={handlePost}
                disabled={isPosting || isUploading || (!postContent.trim() && !imageUrl)}
                size="sm"
              >
                {isPosting ? 'Posting…' : 'Post'}
              </Button>
            </div>
          </div>
        )}

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
