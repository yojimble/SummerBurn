import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import type { NostrEvent } from '@nostrify/nostrify';

// ── Mention (@name link for npub/nprofile) ────────────────────────────────────

export function NostrMention({ pubkey }: { pubkey: string }) {
  const { data } = useAuthor(pubkey);
  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(pubkey).slice(0, 12) + '…';
  return (
    <Link
      to={`/${nip19.npubEncode(pubkey)}`}
      className="text-primary font-medium hover:underline"
    >
      @{name}
    </Link>
  );
}

// ── Note embed (note1 / nevent1) ──────────────────────────────────────────────

function NoteEmbed({ eventId }: { eventId: string }) {
  const { nostr } = useNostr();
  const { data: event, isLoading } = useQuery<NostrEvent | null>({
    queryKey: ['embed', 'note', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const [ev] = await nostr.query([{ ids: [eventId], limit: 1 }], { signal });
      return ev ?? null;
    },
    staleTime: 300000,
  });

  if (isLoading) return <EmbedShell loading />;
  if (!event) return null;
  return <EmbedShell event={event} />;
}

// ── Article embed (naddr1, kind 30023) ───────────────────────────────────────

function NaddrEmbed({ kind, pubkey, identifier }: { kind: number; pubkey: string; identifier: string }) {
  const { nostr } = useNostr();
  const { data: event, isLoading } = useQuery<NostrEvent | null>({
    queryKey: ['embed', 'naddr', kind, pubkey, identifier],
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

  if (isLoading) return <EmbedShell loading />;
  if (!event) return null;
  return <EmbedShell event={event} />;
}

// ── Shared embed shell ────────────────────────────────────────────────────────

function EmbedShell({ event, loading }: { event?: NostrEvent; loading?: boolean }) {
  const { data: author } = useAuthor(event?.pubkey ?? '');
  const name =
    author?.metadata?.display_name ??
    author?.metadata?.name ??
    (event ? nip19.npubEncode(event.pubkey).slice(0, 12) + '…' : '');

  const title = event?.tags.find(([t]) => t === 'title')?.[1];
  const summary = event?.tags.find(([t]) => t === 'summary')?.[1];
  const image = event?.tags.find(([t]) => t === 'image')?.[1];
  const isArticle = event && (event.kind === 30023 || event.kind === 30024);

  const previewText = summary ?? (event?.content.slice(0, 200) + (event?.content.length ?? 0 > 200 ? '…' : ''));

  return (
    <div className="my-2 rounded-lg border border-border bg-muted/40 overflow-hidden text-sm">
      {loading ? (
        <div className="p-3 text-muted-foreground text-xs animate-pulse">Loading…</div>
      ) : (
        <div className="flex gap-3 p-3">
          {image && isArticle && (
            <img src={image} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarImage src={author?.metadata?.picture} />
                <AvatarFallback className="text-[8px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">{name}</span>
              {isArticle && <span className="text-xs text-muted-foreground">· Article</span>}
            </div>
            {title && <p className="font-semibold leading-snug line-clamp-2">{title}</p>}
            {previewText && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{previewText}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export: parse a nostr: URI string and render the right embed ─────────

export function NostrEmbed({ uri }: { uri: string }) {
  const bech32 = uri.replace(/^nostr:/, '');
  let decoded;
  try {
    decoded = nip19.decode(bech32);
  } catch {
    return <span className="text-muted-foreground text-xs">{uri}</span>;
  }

  switch (decoded.type) {
    case 'npub':
      return <NostrMention pubkey={decoded.data} />;
    case 'nprofile':
      return <NostrMention pubkey={decoded.data.pubkey} />;
    case 'note':
      return <NoteEmbed eventId={decoded.data} />;
    case 'nevent':
      return <NoteEmbed eventId={decoded.data.id} />;
    case 'naddr':
      return (
        <NaddrEmbed
          kind={decoded.data.kind}
          pubkey={decoded.data.pubkey}
          identifier={decoded.data.identifier}
        />
      );
    default:
      return <span className="text-muted-foreground text-xs">{uri}</span>;
  }
}
