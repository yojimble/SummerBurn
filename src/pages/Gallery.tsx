import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { GalleryCard } from '@/components/GalleryCard';
import { CDListingCard } from '@/components/CDListingCard';
import { useGallery } from '@/hooks/useGallery';
import { useCDListings } from '@/hooks/useCDListings';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Skeleton } from '@/components/ui/skeleton';

const Gallery = () => {
  useSeoMeta({
    title: 'Gallery — Bitcoin Summer Burn 2026',
    description: 'Cover art and summer images from Bitcoin Summer Burn 2026 participants.',
  });

  const { data: images, isLoading } = useGallery();
  const { data: cdListings, isLoading: listingsLoading } = useCDListings();
  const { user } = useCurrentUser();

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Gallery</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cover art and summer vibes from the Burn
          </p>
        </div>

        {(listingsLoading || (cdListings && cdListings.length > 0)) && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">CDs</h2>
            {listingsLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {cdListings!.map((listing) => (
                  <CDListingCard key={listing.id} event={listing} />
                ))}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : images && images.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {images.map((img) => (
              <GalleryCard key={img.id} event={img} />
            ))}
          </div>
        ) : !listingsLoading && (!cdListings || cdListings.length === 0) ? (
          <div className="text-center py-20 text-muted-foreground space-y-3">
            <p className="text-5xl">🎨</p>
            <p className="font-semibold text-lg text-foreground">No artwork yet</p>
            <p className="text-sm">
              Cover art is preferred — some Burners spend more time on it than the playlist itself.
              {user ? ' Publish your CD from your Account page!' : ' Log in to publish yours!'}
            </p>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default Gallery;
