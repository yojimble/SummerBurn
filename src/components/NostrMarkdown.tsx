import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { NostrEmbed } from '@/components/NostrEmbed';
import { MediaPlayer } from '@/components/MediaPlayer';
import { LinkPreviewCard } from '@/components/LinkPreviewCard';

const TOKEN_REGEX = /(nostr:[a-zA-Z0-9]+)/g;
const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp|avif)(\?\S*)?$/i;
const VIDEO_EXT_REGEX = /\.(mp4|webm|ogg|mov)(\?\S*)?$/i;
const BARE_URL_REGEX = /^https?:\/\/\S+$/i;

function renderInline(text: string) {
  const parts = text.split(TOKEN_REGEX);
  return parts.map((part, i) => {
    if (part.startsWith('nostr:')) return <NostrEmbed key={i} uri={part} />;
    return part;
  });
}

interface Props {
  content: string;
  className?: string;
}

export function NostrMarkdown({ content, className }: Props) {
  return (
    <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkBreaks]}
      urlTransform={(url) => url}
      components={{
        a({ href, children }) {
          if (href?.startsWith('nostr:')) return <NostrEmbed uri={href} />;
          if (href && VIDEO_EXT_REGEX.test(href)) {
            return <MediaPlayer src={href} className="mt-2 rounded-md max-h-96 w-full" />;
          }
          if (href && IMAGE_EXT_REGEX.test(href)) {
            return <img src={href} alt="" className="mt-2 rounded-md max-h-96 w-full" loading="lazy" />;
          }
          // Bare autolinked URL (link text equals the href itself) — show a preview card.
          const linkText = Array.isArray(children) ? children.join('') : children;
          if (href && BARE_URL_REGEX.test(href) && linkText === href) {
            return <LinkPreviewCard url={href} />;
          }
          return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
        },
        p({ children }) {
          if (typeof children === 'string') {
            if (children.startsWith('nostr:')) return <NostrEmbed uri={children} />;
            if (VIDEO_EXT_REGEX.test(children) && children.startsWith('http')) {
              return <MediaPlayer src={children} className="mt-2 rounded-md max-h-96 w-full" />;
            }
            if (IMAGE_EXT_REGEX.test(children) && children.startsWith('http')) {
              return <img src={children} alt="" className="mt-2 rounded-md max-h-96 w-full" loading="lazy" />;
            }
            if (BARE_URL_REGEX.test(children)) {
              return <LinkPreviewCard url={children} />;
            }
            return <p>{renderInline(children)}</p>;
          }
          return <p>{children}</p>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
