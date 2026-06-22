import { useMutation } from '@tanstack/react-query';
import { finalizeEvent, generateSecretKey, getEventHash } from 'nostr-tools';
import { getConversationKey, encrypt as nip44Encrypt } from 'nostr-tools/nip44';
import { SimplePool } from 'nostr-tools/pool';
import { useCurrentUser } from './useCurrentUser';
import { DM_RELAYS } from '@/lib/summerBurn';
import type { NostrSigner, NostrEvent } from '@nostrify/nostrify';

// Slightly randomize timestamps (up to 2 days in the past), per NIP-59, so
// the seal/wrap timestamps don't leak exactly when a DM was sent.
function randomNow(): number {
  return Math.floor(Date.now() / 1000 - Math.random() * 2 * 24 * 60 * 60);
}

interface Rumor {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey: string;
}

// Builds a NIP-17 gift-wrapped DM, signed via the real account's signer
// (works with NIP-07 extensions and bunkers, not just raw nsec) rather than
// nostr-tools' wrapEvent helper, which requires direct access to the
// sender's private key.
async function buildGiftWrap(rumor: Rumor, recipientPubkey: string, signer: NostrSigner): Promise<NostrEvent> {
  if (!signer.nip44) throw new Error('Your signer does not support encrypted DMs (NIP-44)');

  const rumorWithId = { ...rumor, id: getEventHash(rumor) };
  const sealContent = await signer.nip44.encrypt(recipientPubkey, JSON.stringify(rumorWithId));
  const seal = await signer.signEvent({ kind: 13, content: sealContent, tags: [], created_at: randomNow() });

  const ephemeralKey = generateSecretKey();
  const conversationKey = getConversationKey(ephemeralKey, recipientPubkey);
  const wrapContent = nip44Encrypt(JSON.stringify(seal), conversationKey);

  return finalizeEvent(
    { kind: 1059, content: wrapContent, tags: [['p', recipientPubkey]], created_at: randomNow() },
    ephemeralKey,
  ) as NostrEvent;
}

export function useSendDM() {
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async ({ recipientPubkey, content, extraTags }: { recipientPubkey: string; content: string; extraTags?: string[][] }) => {
      if (!user) throw new Error('Must be logged in to send a DM');

      const rumor: Rumor = {
        kind: 14,
        content,
        tags: [['p', recipientPubkey], ...(extraTags ?? [])],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: user.pubkey,
      };

      // One wrap for the recipient, one self-addressed copy so the sender
      // sees their own message in any NIP-17-compatible client.
      const wraps = await Promise.all([
        buildGiftWrap(rumor, recipientPubkey, user.signer),
        buildGiftWrap(rumor, user.pubkey, user.signer),
      ]);

      const pool = new SimplePool();
      try {
        await Promise.all(wraps.map((wrap) => Promise.any(pool.publish(DM_RELAYS, wrap))));
      } finally {
        pool.close(DM_RELAYS);
      }
    },
  });
}
