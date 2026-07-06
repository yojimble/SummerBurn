import { useLinkPreview } from '@/hooks/useLinkPreview';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  url: string;
}

export function LinkPreviewCard({ url }: Props) {
  const { data, isLoading, isError } = useLinkPreview(url);

  if (isError) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="break-all">
        {url}
      </a>
    );
  }

  if (isLoading) {
    return (
      <span className="mt-2 flex items-center gap-3 rounded-lg border border-border p-3 not-prose">
        <Skeleton className="h-16 w-16 shrink-0 rounded-md" />
        <span className="flex-1 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </span>
      </span>
    );
  }

  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    // keep raw url as fallback
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-3 rounded-lg border border-border p-3 not-prose hover:bg-accent/50 transition-colors"
    >
      {data?.image && (
        <img
          src={data.image}
          alt=""
          className="h-16 w-16 shrink-0 rounded-md object-cover bg-muted"
          loading="lazy"
        />
      )}
      <span className="flex-1 min-w-0 space-y-0.5">
        <span className="block text-xs text-muted-foreground uppercase tracking-wide">
          {data?.publisher || hostname}
        </span>
        {data?.title && (
          <span className="block text-sm font-semibold text-foreground truncate">{data.title}</span>
        )}
        {data?.description && (
          <span className="block text-xs text-muted-foreground line-clamp-2">{data.description}</span>
        )}
      </span>
    </a>
  );
}
