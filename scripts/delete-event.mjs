#!/usr/bin/env node
/**
 * Summer Burn 2026 — Delete a Nostr event (NIP-09 kind 5)
 *
 * Usage:
 *   node scripts/delete-event.mjs <nevent1bech32orEventId> nsec1...
 */

import * as nip19 from 'nostr-tools/nip19';
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.mom',
  'wss://relay.primal.net',
];

async function main() {
  const targetArg = process.argv[2]?.trim();
  const nsecArg = process.argv[3]?.trim();

  if (!nsecArg || !targetArg) {
    console.error('Usage: node scripts/delete-event.mjs <nevent1...orEventId> nsec1...');
    process.exit(1);
  }

  let privkeyBytes;
  try {
    const decoded = nip19.decode(nsecArg);
    if (decoded.type !== 'nsec') throw new Error('Not a valid nsec');
    privkeyBytes = decoded.data;
  } catch (e) {
    console.error('Error: Could not parse nsec:', e.message);
    process.exit(1);
  }

  let eventId;
  if (targetArg.startsWith('nevent1')) {
    const decoded = nip19.decode(targetArg);
    if (decoded.type !== 'nevent') {
      console.error('Error: Could not decode nevent');
      process.exit(1);
    }
    eventId = decoded.data.id;
  } else {
    eventId = targetArg;
  }

  console.log(`Pubkey:   ${getPublicKey(privkeyBytes)}`);
  console.log(`Event ID: ${eventId}`);

  const deleteEvent = finalizeEvent({
    kind: 5,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['e', eventId]],
    content: 'deleted',
  }, privkeyBytes);

  console.log('\nPublishing delete request...');
  const pool = new SimplePool();
  try {
    await Promise.any(pool.publish(RELAYS, deleteEvent));
    console.log('✓ Delete event published successfully');
    console.log(`  Delete event ID: ${deleteEvent.id}`);
  } catch (e) {
    console.error('✗ Failed to publish to any relay:', e);
  }

  pool.close(RELAYS);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
