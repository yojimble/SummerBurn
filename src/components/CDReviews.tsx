import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCDReviews, reviewDTag } from '@/hooks/useCDReviews';
import { KIND_CD_REVIEW } from '@/lib/summerBurn';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

export function CDStarWidget({ sellerPubkey }: { sellerPubkey: string }) {
  const { user } = useCurrentUser();
  const { data: reviews } = useCDReviews(sellerPubkey);
  const { mutateAsync: publish, isPending } = useNostrPublish();
  const queryClient = useQueryClient();

  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const isOwnCD = user?.pubkey === sellerPubkey;
  const count = reviews?.length ?? 0;
  const avg = count > 0 ? reviews!.reduce((sum, r) => sum + r.stars, 0) / count : 0;
  const displayRating = hover || Math.round(avg);

  const handleClick = async (n: number) => {
    if (isOwnCD) return;
    if (!user) {
      toast({ title: "Log in to leave a review." });
      return;
    }
    if (submitted || isPending) return;
    try {
      const score = ((n - 1) / 4).toFixed(2);
      await publish({
        kind: KIND_CD_REVIEW,
        content: '',
        tags: [
          ['d', reviewDTag(sellerPubkey)],
          ['rating', score, 'thumb'],
        ],
      });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'cd-reviews', sellerPubkey] });
      toast({ title: `${n} star${n > 1 ? 's' : ''} — thanks! ⭐` });
      setSubmitted(true);
    } catch {
      toast({ title: 'Failed to submit review', description: 'Please try again.' });
    }
  };

  const stars = (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={isPending}
          onMouseEnter={() => !submitted && !isOwnCD && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => handleClick(n)}
          className="text-xl leading-none transition-colors cursor-pointer disabled:cursor-wait"
        >
          <span className={n <= displayRating ? 'text-yellow-400' : 'text-muted-foreground/30'}>★</span>
        </button>
      ))}
      {count > 0 && <span className="text-sm text-muted-foreground ml-1">({count})</span>}
    </div>
  );

  if (isOwnCD) {
    return (
      <div className="flex items-center gap-2 group">
        {stars}
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-5">
          Rating your own CD? Bold move. 😏
        </span>
      </div>
    );
  }

  return stars;
}
