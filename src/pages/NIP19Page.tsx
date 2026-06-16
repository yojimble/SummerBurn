import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { CDListingDetail } from '@/components/CDListingDetail';
import { KIND_CD_LISTING } from '@/lib/summerBurn';
import NotFound from './NotFound';

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
    case 'nprofile':
      // AI agent should implement profile view here
      return <div>Profile placeholder</div>;

    case 'note':
      // AI agent should implement note view here
      return <div>Note placeholder</div>;

    case 'nevent':
      // AI agent should implement event view here
      return <div>Event placeholder</div>;

    case 'naddr':
      if (decoded.data.kind === KIND_CD_LISTING) {
        return (
          <Layout>
            <CDListingDetail pubkey={decoded.data.pubkey} />
          </Layout>
        );
      }
      return <div>Addressable event placeholder</div>;

    default:
      return <NotFound />;
  }
} 