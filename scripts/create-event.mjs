#!/usr/bin/env node
/**
 * Summer Burn 2026 — Create Calendar Event
 *
 * Publishes a NIP-52 kind 31923 date-based calendar event as the organiser.
 * Run once. After running, paste the printed coordinate into src/lib/summerBurn.ts.
 *
 * Usage:
 *   node scripts/create-event.mjs nsec1...
 */

import { createInterface } from 'readline';
import * as nip19 from 'nostr-tools/nip19';
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';

const ORGANIZER_PUBKEY = '6a400414dbd303a27592a2d68a724ea690e6fa0c365358e32cd1a56c93a5abb5';

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.mom',
  'wss://relay.primal.net',
];

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(prompt) {
  return new Promise(resolve => rl.question(prompt, answer => resolve(answer.trim())));
}

async function main() {
  const nsecArg = process.argv[2]?.trim() || process.env.ORGANIZER_NSEC?.trim();
  if (!nsecArg) {
    console.error('Usage: node scripts/create-event.mjs nsec1...');
    rl.close();
    process.exit(1);
  }

  let privkeyBytes;
  try {
    const decoded = nip19.decode(nsecArg);
    if (decoded.type !== 'nsec') throw new Error('Not a valid nsec');
    privkeyBytes = decoded.data;
  } catch (e) {
    console.error('Error: Could not parse nsec:', e.message);
    rl.close();
    process.exit(1);
  }

  if (getPublicKey(privkeyBytes) !== ORGANIZER_PUBKEY) {
    console.error('Error: nsec does not match organiser pubkey.');
    rl.close();
    process.exit(1);
  }

  console.log('✓ Organiser key verified\n');

  // Prompt for event details
  const titleInput = await ask('Event title [Bitcoin Summer Burn 2026]: ');
  const title = titleInput || 'Bitcoin Summer Burn 2026';

  const startInput = await ask('Start date (YYYY-MM-DD) [2026-07-21]: ');
  const startDate = startInput || '2026-07-21';
  const startTimestamp = String(Math.floor(new Date(startDate + 'T12:00:00Z').getTime() / 1000));

  const locationInput = await ask('Location [Worldwide]: ');
  const location = locationInput || 'Worldwide';

  const imageInput = await ask('Image URL (https://...) [leave blank to skip]: ');
  const image = imageInput || '';

  const dTag = 'summerburn2026';
  const coordinate = `31923:${ORGANIZER_PUBKEY}:${dTag}`;

  console.log('\nEvent to be published:');
  console.log(`  Title:      ${title}`);
  console.log(`  Start date: ${startDate} (${startTimestamp})`);
  console.log(`  Location:   ${location}`);
  if (image) console.log(`  Image:      ${image}`);
  console.log(`  Coordinate: ${coordinate}`);

  const confirm = await ask('\nPublish this event? [y/N]: ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Aborted.');
    rl.close();
    return;
  }

  rl.close();

  const event = finalizeEvent({
    kind: 31923,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', dTag],
      ['title', title],
      ['summary', 'A community music swap event on Nostr. Burn three CDs, post them to strangers, receive CDs in return.'],
      ['start', startTimestamp],
      ['location', location],
      ['t', 'summerburn2026'],
      ['t', 'music'],
      ...(image ? [['image', image]] : []),
    ],
    content: '',
  }, privkeyBytes);

  console.log('\nPublishing...');
  const pool = new SimplePool();
  try {
    await Promise.any(pool.publish(RELAYS, event));
    console.log('✓ Published successfully!\n');
    console.log('Now paste this into src/lib/summerBurn.ts:');
    console.log(`\n  CALENDAR_EVENT_COORDINATE = '${coordinate}'\n`);
  } catch (e) {
    console.error('✗ Failed to publish to any relay:', e);
  }

  pool.close(RELAYS);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
