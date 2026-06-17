export const HASHTAG = 'summerburn2026';

// Marker tag on forum thread root posts, distinguishing them from regular
// feed posts (both use the `#t` HASHTAG above and have no `e` tag).
export const FORUM_TAG = 'summerburn2026-forum';

// Forum threads posted before FORUM_TAG existed, kept visible in the forum
// by id since they can't be retroactively tagged.
export const LEGACY_FORUM_THREAD_IDS = [
  'bd235e754903d911199e933d744914d096d954be76efb6b5b76f2397e5fe7db2',
];

export const DM_RELAYS = [
  'wss://nos.lol',
  'wss://nostr.mom',
  'wss://relay.primal.net',
  'wss://relay.damus.io',
];
export const RSVP_D_TAG = 'summerburn2026';
export const EVENT_START_DATE = 'July 21, 2026';

// Once you create the calendar event on Nostr, paste the coordinate here.
// Format: "31923:your-pubkey-hex:your-d-tag"
export const CALENDAR_EVENT_COORDINATE = '31923:6a400414dbd303a27592a2d68a724ea690e6fa0c365358e32cd1a56c93a5abb5:summerburn2026';

// The organiser's Nostr pubkey (hex).
export const ORGANIZER_PUBKEY = '6a400414dbd303a27592a2d68a724ea690e6fa0c365358e32cd1a56c93a5abb5';

// Whether a user can post in the feed/forum: either RSVPed, or the organiser
// (who needs to be able to post announcements without RSVPing).
export function isPermittedPoster(pubkey: string | undefined, rsvpedPubkeys: Set<string> | undefined): boolean {
  if (!pubkey) return false;
  if (pubkey === ORGANIZER_PUBKEY) return true;
  return !!rsvpedPubkeys?.has(pubkey);
}

// Custom event kinds
// kind 31926: organiser publishes one per sender, NIP-44 encrypted to sender's pubkey.
//   content: JSON { recipients: [anonPubkey1, anonPubkey2, anonPubkey3] }
//   d-tag:   "summerburn2026:{senderPubkey}"
export const KIND_MATCH = 31926;

// kind 31930: recipient marks a specific sender's CD as received.
//   signed by recipient's anon keypair
//   d-tag: senderAnonPubkey
export const KIND_CD_RECEIVED = 31930;

// Organiser's "Summer Burn is live!" post — participants react to this with
// 📬 (CDs posted) or 📀 (CDs received) using Kind 7 reactions.
export const SWAP_STATUS_EVENT_ID = 'd22c6e22231865a341dd9e8111737245b0575a5a95e24793972c17f00292e9b5';
export const REACTION_CD_POSTED = '📬';
export const REACTION_CD_RECEIVED = '📀';

// kind 31928: sender publishes postage cost for a specific recipient.
//   signed by sender's anon keypair
//   d-tag: recipientAnonPubkey
//   content: cost string e.g. "£2.50"
export const KIND_POSTAGE_COST = 31928;

// kind 31929: sender publishes postage receipt image URL for a specific recipient.
//   signed by sender's anon keypair
//   d-tag: recipientAnonPubkey
//   content: Blossom image URL
export const KIND_POSTAGE_RECEIPT = 31929;

// Kind 31555: GammaMarkets product review (NIP-99 extension).
//   d-tag: "a:30402:<seller-pubkey>:<CD_LISTING_D_TAG>"
//   rating tag: ["rating", "<0.00-1.00>", "thumb"] — 0=1★, 0.25=2★, 0.5=3★, 0.75=4★, 1=5★
export const KIND_CD_REVIEW = 31555;

// NIP-99 classified listing, used for "publish your CD" in Account.
// One listing per user, addressable via (kind, pubkey, CD_LISTING_D_TAG).
// A "status" tag of "active" marks it as for-sale (offering extra copies);
// when absent, it's shown in the Gallery only.
export const KIND_CD_LISTING = 30402;
export const CD_LISTING_D_TAG = 'summerburn2026-cd';

// Derives a deterministic anonymous pubkey for a recipient.
// The organiser can re-derive the private key from the recipient's real pubkey to read DMs.
// Derivation: sha256("summerburn2026:" + recipientPubkey) → use as secp256k1 privkey.
export async function deriveAnonPubkey(recipientPubkey: string): Promise<string> {
  const { getPublicKey } = await import('nostr-tools');
  const data = new TextEncoder().encode(`summerburn2026:${recipientPubkey}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return getPublicKey(new Uint8Array(hashBuffer));
}
