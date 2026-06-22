# Nostr Secret Santa

An open-source, anonymous gift-exchange framework built on Nostr. Sign up, get matched
anonymously with other participants, exchange postal addresses without revealing your real
identity, and send/receive whatever the swap is themed around — no central server, no
database, no platform holding your data. Everything runs as Nostr events.

This repo's current theme is **Bitcoin Summer Burn 2026**, a physical CD swap (make a mix,
burn three copies, post them to three matched strangers, receive three back) — but the
matching, anonymity, and dispatch mechanics aren't CD-specific. Swap the theme/copy and it
works for any "everyone sends something physical to N anonymously-matched people" event:
zines, postcards, stickers, mixtapes, whatever.

## The anonymiser

The hard problem in a postal swap is letting strangers exchange addresses without anyone
(including the organiser) building a permanent map of "real identity → home address."
This app handles that in a few layers:

- **Real identity is used for everything social.** RSVPing, posting/replying/quoting in the
  feed and forum, uploading gallery art and zapping — all signed with your real Nostr account. None of that needs to be
  anonymous, and being identifiable is what makes the social side fun.
- **The anon identity is used for exactly three things: addresses, dispatch DMs and optional feedback.**
  From the Account page, each participant generates a disposable, one-off Nostr keypair
  that exists only for this swap, stored locally in their browser. It's used only to:
  1. **Exchange postal addresses.** Send/receive your address as a NIP-17 private direct
     message (kind 14, sealed and gift-wrapped per NIP-59), routed between anon keypairs —
     never your real account.
  2. **Signal that your CDs have been posted.** A kind 7 reaction (📬) published from your
     anon key to a shared anchor event lets the app show a live count of CDs in the post,
     without revealing which participant it came from.
  3. **Notify your sender when their CD arrives.** When a recipient marks a CD as received,
     the app sends a NIP-17 private DM from the recipient's anon key to the sender's anon
     key — so the sender gets a quiet notification without any public trace.
  4. **Leave optional anonymous feedback.** A sender can upload a proof-of-postage receipt
     image signed by their anon key, so the recipient gets reassurance without learning
     who sent it.
- **Encrypted matching links the two.** Once sign-ups close, the organiser runs the
  matching script, which randomly assigns each participant three recipients and three
  senders by their *anon* pubkeys, and publishes the result as a NIP-44 encrypted event
  addressed to that participant's real pubkey, readable by no one else. That match event
  is the only place a real identity and an anon pubkey are linked together — and only the
  organiser and that one participant ever see it.

End to end: the organiser knows *who's participating*, but not *who is sending what to
whom*. Recipients and senders only ever see each other as anonymous pubkeys, unless they
choose to reveal themselves.

## Social features

The swap isn't just a matching algorithm — there's a full social layer to keep
participants engaged while they wait for the post to arrive:

- **Feed** — a community feed of every post tagged with the event hashtag from RSVPed
  participants (plus the organiser). Each post supports inline **replies**, **likes**
  (NIP-25 reactions), and **zaps** (NIP-57 Lightning tips) — straight from the feed, no
  need to leave the app.
- **Forum** — proper threaded discussion, gated to RSVPed participants. Start a thread,
  reply, and **quote** any post into a new thread (NIP-18) to spin off a related
  conversation. The organiser can post and reply without needing to RSVP, since they're
  running the thing.
- **Gallery** — a grid of cover art and "publish your item" listings from participants,
  so people can show off what they made before it even arrives in the post.
- **Listings (NIP-99)** — from the Account page, publish what you're sending as a proper
  classified listing: a title, description, and up to five images. Toggle a listing
  active/inactive without deleting it, and optionally flag that you're happy to send extra
  copies to people outside the swap who cover their own postage — those listings show a
  badge and are zappable directly from their product page.
- **Zaps everywhere** — tip the organiser, zap a sender to say thanks for their item, or
  zap any post in the feed. All Lightning, all NIP-57.

## Organiser tooling

`scripts/match.mjs` runs the random matching once sign-ups close — see
`MATCHING_INSTRUCTIONS.txt` for the full walkthrough (dry run first, then `--publish`).
`scripts/create-event.mjs` publishes a NIP-52 calendar event for the swap date.

### Blocking a pubkey

To hide a listing from the gallery and exclude it from the published/posted stats, add the
hex pubkey to `BLOCKED_PUBKEYS` in `src/lib/summerBurn.ts`:

```ts
export const BLOCKED_PUBKEYS = new Set([
  'abc123...', // reason / display name
]);
```

To convert an npub to hex: `node -e "const {nip19} = require('nostr-tools'); console.log(nip19.decode('npub1...').data)"`

## Tech stack

React, TypeScript, TailwindCSS, Vite, shadcn/ui, [Nostrify](https://nostrify.dev) for Nostr
protocol integration, and TanStack Query for data fetching.

## Development

```bash
npm install
npm run dev
```

## License

Open source.
