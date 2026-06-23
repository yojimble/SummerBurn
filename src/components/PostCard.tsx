import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LikeButton } from '@/components/LikeButton';
import { ZapButton } from '@/components/ZapButton';
import { ReplyForm } from '@/components/ReplyForm';
import { NostrEmbed } from '@/components/NostrEmbed';
import { useAuthor } from '@/hooks/useAuthor';
import { useThread } from '@/hooks/useThread';
import { useRSVPs } from '@/hooks/useRSVPs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isPermittedPoster } from '@/lib/summerBurn';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

const TOKEN_REGEX = /(https?:\/\/\S+|nostr:[a-zA-Z0-9]+)/g;
const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp|avif)(\?\S*)?$/i;

function renderContent(content: string) {
  const parts = content.split(TOKEN_REGEX);

  return parts.map((part, i) => {
    if (IMAGE_EXT_REGEX.test(part) && part.startsWith('http')) {
      return (
        <img
          key={i}
          src={part}
          alt=""
          className="mt-2 rounded-md max-h-96 w-auto block"
          loading="lazy"
        />
      );
    }
    if (part.startsWith('http')) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {part}
        </a>
      );
    }
    if (part.startsWith('nostr:')) {
      return <NostrEmbed key={i} uri={part} />;
    }
    return part;
  });
}

function timeAgo(ts: number): string {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Threading helpers ─────────────────────────────────────────────────────────

interface ThreadNode {
  event: NostrEvent;
  children: ThreadNode[];
}

function getParentId(event: NostrEvent, rootId: string): string {
  const eTags = event.tags.filter(([name]) => name === 'e');
  // NIP-10 explicit reply marker
  const replyTag = eTags.find(([,, , m]) => m === 'reply');
  if (replyTag) return replyTag[1];
  // Our ReplyForm uses 'mention' for the quoted (parent) event
  const mentionTag = eTags.find(([,, , m]) => m === 'mention');
  if (mentionTag) return mentionTag[1];
  // Old positional style: last e tag that isn't the root is the parent
  if (eTags.length >= 2) {
    const notRoot = eTags.filter(([, id]) => id !== rootId);
    if (notRoot.length > 0) return notRoot[notRoot.length - 1][1];
  }
  return rootId;
}

function buildTree(replies: NostrEvent[], rootId: string): ThreadNode[] {
  const nodeMap = new Map<string, ThreadNode>();
  for (const event of replies) nodeMap.set(event.id, { event, children: [] });

  const roots: ThreadNode[] = [];
  for (const event of replies) {
    const node = nodeMap.get(event.id)!;
    const parentId = getParentId(event, rootId);
    const parent = nodeMap.get(parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

// ── ReplyBlock ────────────────────────────────────────────────────────────────

function ReplyBlock({
  event,
  root,
  isRsvped,
  depth,
}: {
  event: NostrEvent;
  root: NostrEvent;
  isRsvped: boolean;
  depth: number;
}) {
  const { data } = useAuthor(event.pubkey);
  const [replying, setReplying] = useState(false);
  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(event.pubkey).slice(0, 12) + '…';

  return (
    <div className={depth > 0 ? 'pl-4 border-l-2 border-border' : ''}>
      <div className="flex gap-2">
        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
          <AvatarImage src={data?.metadata?.picture} alt={name} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">
            {name}{' '}
            <span className="text-muted-foreground font-normal">· {timeAgo(event.created_at)}</span>
          </p>
          <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {renderContent(event.content)}
          </div>
          {isRsvped && (
            <button
              type="button"
              onClick={() => setReplying(v => !v)}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              {replying ? 'Cancel' : 'Reply'}
            </button>
          )}
          {replying && (
            <div className="mt-2">
              <ReplyForm
                root={root}
                quoting={event}
                onClearQuote={() => setReplying(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadedReplies({
  nodes,
  root,
  isRsvped,
  depth = 0,
}: {
  nodes: ThreadNode[];
  root: NostrEvent;
  isRsvped: boolean;
  depth?: number;
}) {
  return (
    <div className="space-y-3">
      {nodes.map(node => (
        <div key={node.event.id} className="space-y-3">
          <ReplyBlock event={node.event} root={root} isRsvped={isRsvped} depth={depth} />
          {node.children.length > 0 && (
            <div className="pl-4">
              <ThreadedReplies
                nodes={node.children}
                root={root}
                isRsvped={isRsvped}
                depth={depth + 1}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── ArticleCard (kind 30023) ──────────────────────────────────────────────────

function ArticleCard({ event }: { event: NostrEvent }) {
  const { data } = useAuthor(event.pubkey);
  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(event.pubkey).slice(0, 12) + '…';

  const title = event.tags.find(([t]) => t === 'title')?.[1];
  const summary = event.tags.find(([t]) => t === 'summary')?.[1];
  const image = event.tags.find(([t]) => t === 'image')?.[1];
  const excerpt = summary ?? event.content.replace(/^#.*\n?/gm, '').trim().slice(0, 280);

  const naddr = nip19.naddrEncode({
    kind: event.kind,
    pubkey: event.pubkey,
    identifier: event.tags.find(([t]) => t === 'd')?.[1] ?? '',
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      {image && (
        <img src={image} alt={title ?? ''} className="w-full max-h-48 object-cover rounded-t-lg" />
      )}
      <CardContent className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={data?.metadata?.picture} alt={name} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{name} · {timeAgo(event.created_at)}</span>
          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-auto">Article</span>
        </div>
        {title && <h3 className="font-bold text-base leading-snug">{title}</h3>}
        {excerpt && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{excerpt}</p>
        )}
        <a
          href={`/${naddr}`}
          className="text-xs text-primary hover:underline"
        >
          Read full article →
        </a>
      </CardContent>
    </Card>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────

export function PostCard({ event }: { event: NostrEvent }) {
  if (event.kind === 30023) return <ArticleCard event={event} />;

  const { data } = useAuthor(event.pubkey);
  const { user } = useCurrentUser();
  const { data: rsvps } = useRSVPs();
  const [expanded, setExpanded] = useState(false);
  const { data: thread } = useThread(event.id);

  const name =
    data?.metadata?.display_name ??
    data?.metadata?.name ??
    nip19.npubEncode(event.pubkey).slice(0, 12) + '…';
  const picture = data?.metadata?.picture;
  const isRsvped = isPermittedPoster(user?.pubkey, rsvps?.pubkeys);

  const replies = thread?.replies ?? [];
  const latestReply = replies[replies.length - 1];
  const hiddenCount = replies.length - 1;
  const tree = expanded ? buildTree(replies, event.id) : [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={picture} alt={name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-none truncate">{name}</p>
            <p className="text-xs text-muted-foreground mt-1">{timeAgo(event.created_at)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {renderContent(event.content)}
        </div>

        <div className="flex items-center gap-1 -mx-2">
          <LikeButton event={event} />
          <Button variant="ghost" size="sm" onClick={() => setExpanded(v => !v)}>
            💬 {replies.length > 0 ? replies.length : 'Reply'}
          </Button>
          <ZapButton pubkey={event.pubkey} label={name} event={event} compact />
        </div>

        {/* Latest reply preview */}
        {!expanded && latestReply && (
          <div className="space-y-2 pt-2 border-t border-border">
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
            <ReplyBlock event={latestReply} root={event} isRsvped={isRsvped} depth={0} />
          </div>
        )}

        {/* Expanded threaded view */}
        {expanded && (
          <div className="pt-2 border-t border-border space-y-3">
            <ThreadedReplies nodes={tree} root={event} isRsvped={isRsvped} />
            {isRsvped ? (
              <ReplyForm root={event} />
            ) : user ? (
              <p className="text-xs text-muted-foreground">RSVP to join the conversation.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Log in and RSVP to reply.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
