# Bitcoin Summer Burn 2026

A physical CD swap, coordinated on Nostr. Make a mix, burn three copies, and send them to
three strangers anonymously matched on signup — then receive three CDs back in return.

Built as a Nostr client: RSVPs, matching, and the postage-address exchange all happen as
Nostr events, with no central database. Anyone with a Nostr account can take part.

## Features

- **RSVP** — sign up for the swap with your Nostr account.
- **Anonymous matching** — the organiser publishes encrypted match assignments; recipients
  exchange postal addresses via gift-wrapped DMs (NIP-17/NIP-59) sent between one-off anon
  keypairs, so no one's real identity or address is exposed beyond the organiser.
- **CD Dispatch** — mark your CDs as posted, upload proof-of-postage receipts, and zap
  fellow Burners to help cover postage or say thanks for a CD.
- **Publish your CD** — list your CD as a NIP-99 classified listing with a title, tracklist,
  and up to five images. Toggle it active/inactive, and optionally offer extra copies to
  people outside the swap who cover their own postage.
- **Feed** — a community feed of posts tagged `#summerburn2026`, with replies, likes (NIP-25),
  and zaps (NIP-57).
- **Forum** — threaded discussion for RSVPed Burners, with quoting (NIP-18).
- **Gallery** — cover art and CD listings from participants.
- **FAQ** — everything you need to know about the swap.

## Organiser tooling

`scripts/match.mjs` runs the random matching once sign-ups close — see
`MATCHING_INSTRUCTIONS.txt` for the full walkthrough (dry run first, then `--publish`).
`scripts/create-event.mjs` publishes the NIP-52 calendar event for the swap date.

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
