export const HASHTAG = 'summerburn2026';

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

// Custom event kinds
// kind 31926: organiser publishes one per sender, NIP-44 encrypted to sender's pubkey.
//   content: JSON { recipients: [anonPubkey1, anonPubkey2, anonPubkey3] }
//   d-tag:   "summerburn2026:{senderPubkey}"
export const KIND_MATCH = 31926;

// kind 31927: sender publishes to confirm CDs have been posted.
//   d-tag: "summerburn2026-posted"
export const KIND_CD_POSTED = 31927;

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

// Derives a deterministic anonymous pubkey for a recipient.
// The organiser can re-derive the private key from the recipient's real pubkey to read DMs.
// Derivation: sha256("summerburn2026:" + recipientPubkey) → use as secp256k1 privkey.
export async function deriveAnonPubkey(recipientPubkey: string): Promise<string> {
  const { getPublicKey } = await import('nostr-tools');
  const data = new TextEncoder().encode(`summerburn2026:${recipientPubkey}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const privkeyHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return getPublicKey(privkeyHex);
}
