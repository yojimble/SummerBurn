#!/usr/bin/env node
/**
 * Summer Burn 2026 — Organiser Matching Tool
 *
 * 1. Reads all RSVPs (kind 31925, status=accepted)
 * 2. Decrypts NIP-44 DMs sent to the organiser to collect each participant's anon pubkey
 * 3. Generates a random circular matching (3 copies each)
 * 4. Shows a preview — dry run by default
 * 5. Publishes kind 31926 match events when run with --publish
 *
 * Usage:
 *   export ORGANIZER_NSEC=nsec1...
 *   node scripts/match.mjs             # dry run — shows the proposed matching
 *   node scripts/match.mjs --publish   # publishes events to relays
 *
 * Prerequisites:
 *   npm install  (nostr-tools is already in package.json)
 */

import * as nip44 from 'nostr-tools/nip44';
import * as nip19 from 'nostr-tools/nip19';
import { getPublicKey } from 'nostr-tools/pure';
import { finalizeEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';

// ── Config ────────────────────────────────────────────────────────────────────

const ORGANIZER_PUBKEY = '6a400414dbd303a27592a2d68a724ea690e6fa0c365358e32cd1a56c93a5abb5';
const KIND_MATCH = 31926;

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr.mom',
  'wss://relay.primal.net',
];

// ── Main ──────────────────────────────────────────────────────────────────────

const PUBLISH = process.argv.includes('--publish');


async function main() {
  // --- Validate nsec ---
  const nsecEnv = process.argv[2]?.startsWith('nsec1') ? process.argv[2].trim() : process.env.ORGANIZER_NSEC?.trim();
  if (!nsecEnv) {
    console.error('Usage: node scripts/match.mjs nsec1... [--publish]');
    process.exit(1);
  }

  let privkeyBytes;
  try {
    const decoded = nip19.decode(nsecEnv);
    if (decoded.type !== 'nsec') throw new Error('Not a valid nsec');
    privkeyBytes = decoded.data;
  } catch (e) {
    console.error('Error: Could not parse ORGANIZER_NSEC:', e.message);
    process.exit(1);
  }

  const derivedPubkey = getPublicKey(privkeyBytes);
  if (derivedPubkey !== ORGANIZER_PUBKEY) {
    console.error('Error: nsec does not match the hardcoded organiser pubkey.');
    console.error(`  Expected: ${ORGANIZER_PUBKEY}`);
    console.error(`  Got:      ${derivedPubkey}`);
    process.exit(1);
  }

  console.log('✓ Organiser key verified');

  const pool = new SimplePool();

  // --- Fetch RSVPs ---
  console.log('\nFetching RSVPs...');
  const rsvpEvents = await pool.querySync(RELAYS, {
    kinds: [31925],
    '#d': ['summerburn2026'],
    limit: 1000,
  });

  // Latest event per pubkey
  const rsvpMap = new Map();
  for (const ev of rsvpEvents) {
    const existing = rsvpMap.get(ev.pubkey);
    if (!existing || ev.created_at > existing.created_at) {
      rsvpMap.set(ev.pubkey, ev);
    }
  }

  const acceptedPubkeys = new Set();
  for (const [pubkey, ev] of rsvpMap) {
    const statusTag = ev.tags.find(t => t[0] === 'status');
    if (statusTag?.[1] === 'accepted') acceptedPubkeys.add(pubkey);
  }

  console.log(`  ${rsvpMap.size} total RSVPs, ${acceptedPubkeys.size} accepted`);

  // --- Fetch anon key registrations ---
  // Participants sent a NIP-44 encrypted kind 4 DM to the organiser on registration.
  // Content: JSON { anonPubkey: "..." }
  console.log('\nFetching anon key registrations...');
  const dmEvents = await pool.querySync(RELAYS, {
    kinds: [4],
    '#p': [ORGANIZER_PUBKEY],
    limit: 5000,
  });

  // Latest DM per sender
  const dmMap = new Map();
  for (const ev of dmEvents) {
    const existing = dmMap.get(ev.pubkey);
    if (!existing || ev.created_at > existing.created_at) {
      dmMap.set(ev.pubkey, ev);
    }
  }

  // Decrypt and extract anon pubkeys (NIP-44 encrypted)
  const anonMap = new Map(); // real pubkey → anon pubkey
  for (const [senderPubkey, ev] of dmMap) {
    try {
      const convKey = nip44.getConversationKey(privkeyBytes, senderPubkey);
      const plaintext = nip44.decrypt(ev.content, convKey);
      const data = JSON.parse(plaintext);
      if (typeof data?.anonPubkey === 'string') {
        anonMap.set(senderPubkey, data.anonPubkey);
      }
    } catch {
      // Not a registration DM or wrong encryption — skip
    }
  }

  console.log(`  ${anonMap.size} anon keys registered`);

  // --- Cross-reference ---
  const eligible = [];
  for (const pubkey of acceptedPubkeys) {
    if (anonMap.has(pubkey)) {
      eligible.push({ realPubkey: pubkey, anonPubkey: anonMap.get(pubkey) });
    }
  }

  const rsvpedWithoutAnon = [...acceptedPubkeys].filter(pk => !anonMap.has(pk));
  const anonWithoutRsvp = [...anonMap.keys()].filter(pk => !acceptedPubkeys.has(pk));

  console.log('\n=== Eligible participants (RSVPed + anon key registered) ===');
  eligible.forEach((p, i) => {
    const npub = nip19.npubEncode(p.realPubkey);
    const anonNpub = nip19.npubEncode(p.anonPubkey);
    console.log(`  ${String(i + 1).padStart(2)}. ${npub.slice(0, 24)}…  →  anon: ${anonNpub.slice(0, 20)}…`);
  });

  if (rsvpedWithoutAnon.length > 0) {
    console.log(`\n⚠  RSVPed but haven't generated an anon key yet (${rsvpedWithoutAnon.length}):`);
    rsvpedWithoutAnon.forEach(pk => console.log(`    ${nip19.npubEncode(pk).slice(0, 28)}…`));
  }
  if (anonWithoutRsvp.length > 0) {
    console.log(`\n⚠  Registered anon key but not RSVPed — excluded (${anonWithoutRsvp.length})`);
  }

  if (eligible.length < 2) {
    console.error(`\nNeed at least 2 eligible participants. Have ${eligible.length}.`);
    pool.close(RELAYS);
    return;
  }

  // --- Generate matching ---
  // Shuffle randomly then divide into groups of 3.
  // Remainder of 1 is absorbed into the last group (making it a group of 4).
  // Remainder of 2 becomes its own pair.
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const N = shuffled.length;

  // Divide into groups of 4.
  // Remainder 1 → absorb into last group (group of 5).
  // Remainder 2 → two groups of 3 at the end.
  // Remainder 3 → one group of 3 at the end.
  const groups = [];
  let i = 0;
  while (i < N) {
    const remaining = N - i;
    if (remaining === 1) {
      // Absorb lone person into previous group
      groups[groups.length - 1].push(...shuffled.slice(i));
      break;
    } else if (remaining === 2) {
      // Split into two groups of 3 with previous group if possible, else pair
      if (groups.length > 0 && groups[groups.length - 1].length === 4) {
        const last = groups[groups.length - 1];
        const moved = last.splice(last.length - 1, 1);
        groups.push([...moved, ...shuffled.slice(i)]);
      } else {
        groups.push(shuffled.slice(i));
      }
      break;
    } else {
      groups.push(shuffled.slice(i, i + 4));
      i += 4;
    }
  }

  // Within each group everyone sends to and receives from all other members
  const matches = shuffled.map(participant => {
    const group = groups.find(g => g.some(p => p.realPubkey === participant.realPubkey));
    const others = group.filter(p => p.realPubkey !== participant.realPubkey).map(p => p.anonPubkey);
    return { ...participant, sendingTo: others, receivingFrom: others };
  });

  console.log(`\n=== Proposed matching (${N} participants, ${groups.length} group${groups.length !== 1 ? 's' : ''}) ===`);
  for (const [gi, group] of groups.entries()) {
    console.log(`\n  Group ${gi + 1} (${group.length} people — each burns ${group.length - 1} cop${group.length - 1 === 1 ? 'y' : 'ies'}):`);
    group.forEach(p => {
      const npub = nip19.npubEncode(p.realPubkey);
      console.log(`    • ${npub.slice(0, 28)}…`);
    });
  }

  if (!PUBLISH) {
    console.log('\n──────────────────────────────────────────────────────────');
    console.log('DRY RUN — no events published.');
    console.log('Run with --publish to send match events to participants.');
    console.log('──────────────────────────────────────────────────────────');
    pool.close(RELAYS);
    return;
  }

  // --- Publish kind 31926 match events ---
  console.log('\nPublishing match events...');
  const now = Math.floor(Date.now() / 1000);

  let successCount = 0;
  for (const match of matches) {
    const payload = JSON.stringify({
      sendingTo: match.sendingTo,
      receivingFrom: match.receivingFrom,
    });

    const convKey = nip44.getConversationKey(privkeyBytes, match.realPubkey);
    const encrypted = nip44.encrypt(payload, convKey);

    const event = finalizeEvent({
      kind: KIND_MATCH,
      created_at: now,
      tags: [['d', `summerburn2026:${match.realPubkey}`]],
      content: encrypted,
    }, privkeyBytes);

    const npubShort = nip19.npubEncode(match.realPubkey).slice(0, 20) + '…';
    try {
      await Promise.any(pool.publish(RELAYS, event));
      console.log(`  ✓ ${npubShort}`);
      successCount++;
    } catch (e) {
      console.error(`  ✗ ${npubShort}  (failed on all relays)`);
    }
  }

  console.log(`\nDone — ${successCount}/${matches.length} match events published.`);
  pool.close(RELAYS);
}

main().catch(err => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
