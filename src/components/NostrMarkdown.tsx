import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { NostrEmbed } from '@/components/NostrEmbed';

const TOKEN_REGEX = /(nostr:[a-zA-Z0-9]+)/g;
const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp|avif)(\?\S*)?$/i;

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
          if (href && IMAGE_EXT_REGEX.test(href)) {
            return <img src={href} alt="" className="mt-2 rounded-md max-h-96 w-auto block" loading="lazy" />;
          }
          return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
        },
        p({ children }) {
          if (typeof children === 'string') {
            if (children.startsWith('nostr:')) return <NostrEmbed uri={children} />;
            if (IMAGE_EXT_REGEX.test(children) && children.startsWith('http')) {
              return <img src={children} alt="" className="mt-2 rounded-md max-h-96 w-auto block" loading="lazy" />;
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
