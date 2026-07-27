#!/usr/bin/env node
/**
 * Summer Burn 2026 — Organiser Matching Tool
 *
 * 1. Reads gift-wrapped (NIP-59) ADD/REMOVE mix messages sent to the organiser
 *    to resolve which anon npubs are currently active in the mix
 * 2. Generates a non-symmetric circular matching — your 3 recipients ≠ your 3 senders
 * 3. Shows a preview — dry run by default
 * 4. Publishes the matching as gift-wrapped (NIP-17/NIP-59) DMs, one per active
 *    anon npub, addressed to that anon npub — no custom event kind involved
 *
 * Usage:
 *   export ORGANIZER_NSEC=nsec1...
 *   node scripts/match.mjs             # dry run — shows the proposed matching
 *   node scripts/match.mjs --publish   # publishes the same matching shown by the last dry run
 *
 * The dry run's matching is cached to disk (scripts/.match-preview.json) so that
 * --publish sends exactly what you previewed rather than re-shuffling. If the set
 * of active npubs has changed since the preview, the cache is discarded and a
 * fresh matching is generated (which you should preview again before publishing).
 *
 * Prerequisites:
 *   npm install  (nostr-tools is already in package.json)
 */

import * as nip19 from 'nostr-tools/nip19';
import { getPublicKey } from 'nostr-tools/pure';
import { unwrapEvent, wrapEvent } from 'nostr-tools/nip59';
import { SimplePool } from 'nostr-tools/pool';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ── Config ────────────────────────────────────────────────────────────────────

const ORGANIZER_PUBKEY = '6a400414dbd303a27592a2d68a724ea690e6fa0c365358e32cd1a56c93a5abb5';

const CACHE_PATH = join(dirname(fileURLToPath(import.meta.url)), '.match-preview.json');

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

  // --- Fetch mix ADD/REMOVE gift wraps ---
  // Participants join the mix by sending themselves a gift-wrapped (kind 1059)
  // DM to the organiser, signed with their anon key, containing "ADD npub1..."
  // or "REMOVE npub1...". The real identity behind the anon key is never
  // exposed to the organiser — eligibility is purely mix membership.
  console.log('\nFetching mix gift wraps...');
  const wraps = await pool.querySync(RELAYS, {
    kinds: [1059],
    '#p': [ORGANIZER_PUBKEY],
    limit: 5000,
  });

  console.log(`  ${wraps.length} gift wraps found, decrypting...`);

  // A REMOVE for an anon npub is permanent — the site's re-add lockout means
  // there's no legitimate way to see an ADD after a REMOVE for the same npub
  // (matches MixInbox.tsx's "any REMOVE wins" behavior). Full history is kept
  // (not just the outcome) so a dry run can show each npub's real ADD/REMOVE
  // timeline for manual sanity-checking before a live publish.
  const historyByAnonPubkey = new Map(); // anonPubkey hex → [{ action, created_at }, ...]
  for (const wrap of wraps) {
    try {
      const rumor = unwrapEvent(wrap, privkeyBytes);
      if (rumor.kind !== 14) continue;
      const match = rumor.content.trim().match(/^(ADD|REMOVE)\s+(npub1\S+)/);
      if (!match) continue;
      const [, action, npub] = match;
      const { type, data } = nip19.decode(npub);
      if (type !== 'npub') continue;

      const history = historyByAnonPubkey.get(data) ?? [];
      history.push({ action, created_at: rumor.created_at });
      historyByAnonPubkey.set(data, history);
    } catch {
      // Not addressed to us, or malformed — skip
    }
  }

  for (const history of historyByAnonPubkey.values()) {
    history.sort((a, b) => a.created_at - b.created_at);
  }

  const active = [...historyByAnonPubkey.entries()]
    .filter(([, history]) => !history.some(h => h.action === 'REMOVE'))
    .map(([anonPubkey]) => anonPubkey);

  console.log(`\n=== Active in mix (${active.length}) ===`);
  active.forEach((pk, i) => {
    const history = historyByAnonPubkey.get(pk);
    const joinedAt = new Date(history[0].created_at * 1000).toISOString();
    console.log(`  ${String(i + 1).padStart(2)}. ${nip19.npubEncode(pk)}  —  joined: ${joinedAt}`);
  });

  const excludedForRemove = [...historyByAnonPubkey.entries()]
    .filter(([, history]) => history.some(h => h.action === 'REMOVE'));
  if (excludedForRemove.length > 0) {
    console.log(`\n(${excludedForRemove.length} npub(s) excluded — have a REMOVE in their history)`);
  }

  if (active.length < 2) {
    console.error(`\nNeed at least 2 people in the mix. Have ${active.length}.`);
    pool.close(RELAYS);
    return;
  }

  // --- Generate (or reuse) matching ---
  // Circular non-symmetric assignment: shuffle all participants into a ring.
  // Person[i] sends to [i+1, i+2, i+3] and receives from [i-1, i-2, i-3].
  // This guarantees your senders and recipients never overlap (requires N ≥ 7).
  const activeSorted = [...active].sort();
  let shuffled;
  let reusedPreview = false;

  if (PUBLISH && existsSync(CACHE_PATH)) {
    try {
      const cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
      const cacheActiveSorted = [...cache.active].sort();
      if (JSON.stringify(cacheActiveSorted) === JSON.stringify(activeSorted)) {
        shuffled = cache.shuffled;
        reusedPreview = true;
      } else {
        console.log('\n⚠ Active mix membership changed since the last dry run — discarding');
        console.log('  the cached preview and generating a fresh (unpreviewed) matching.');
      }
    } catch {
      console.log('\n⚠ Could not read cached preview — generating a fresh matching.');
    }
  }

  if (!shuffled) {
    shuffled = [...active].sort(() => Math.random() - 0.5);
  }
  const N = shuffled.length;

  if (N < 6) {
    console.error(`\nNeed at least 6 people in the mix for 3-way ring matching. Have ${N}.`);
    pool.close(RELAYS);
    return;
  }

  if (N === 6) {
    console.log('\n⚠ Exactly 6 in the mix: offset 3 wraps onto the same person from both');
    console.log('  directions, so each person will both send to AND receive from one');
    console.log('  shared partner. The other 2 sends/receives stay fully non-overlapping.');
  }

  const matches = shuffled.map((anonPubkey, i) => {
    const sendingTo = [1, 2, 3].map(offset => shuffled[(i + offset) % N]);
    const receivingFrom = [1, 2, 3].map(offset => shuffled[(i - offset + N) % N]);
    return { anonPubkey, sendingTo, receivingFrom };
  });

  console.log(`\n=== Proposed matching (${N} participants, circular ring)${reusedPreview ? ' — from previewed dry run' : ''} ===`);
  console.log('  Each person sends to 3 different people than they receive from.\n');
  for (const [idx, m] of matches.entries()) {
    const npub = nip19.npubEncode(m.anonPubkey).slice(0, 24) + '…';
    console.log(`  ${String(idx + 1).padStart(2)}. ${npub}  →  sends to [${(idx+1)%N+1}, ${(idx+2)%N+1}, ${(idx+3)%N+1}]`);
  }

  if (!PUBLISH) {
    writeFileSync(CACHE_PATH, JSON.stringify({ active, shuffled }), 'utf8');
    console.log('\n──────────────────────────────────────────────────────────');
    console.log('DRY RUN — no events published.');
    console.log('Run with --publish to send this exact matching to participants.');
    console.log('──────────────────────────────────────────────────────────');
    pool.close(RELAYS);
    return;
  }

  if (!reusedPreview) {
    console.log('\n⚠ No matching dry-run preview found for this matching — it was just');
    console.log('  generated fresh and has not been shown to you before now.');
  }

  // --- Publish matches as gift-wrapped DMs, addressed to each anon npub ---
  console.log('\nPublishing match DMs...');

  let successCount = 0;
  for (const match of matches) {
    const payload = JSON.stringify({
      sendingTo: match.sendingTo,
      receivingFrom: match.receivingFrom,
    });

    const wrap = wrapEvent(
      { kind: 14, content: payload, tags: [['p', match.anonPubkey]], created_at: Math.floor(Date.now() / 1000) },
      privkeyBytes,
      match.anonPubkey,
    );

    const npubShort = nip19.npubEncode(match.anonPubkey).slice(0, 24) + '…';
    try {
      await Promise.any(pool.publish(RELAYS, wrap));
      console.log(`  ✓ ${npubShort}`);
      successCount++;
    } catch (e) {
      console.error(`  ✗ ${npubShort}  (failed on all relays)`);
    }
  }

  console.log(`\nDone — ${successCount}/${matches.length} match DMs published.`);
  if (existsSync(CACHE_PATH)) unlinkSync(CACHE_PATH);
  pool.close(RELAYS);
}

main().catch(err => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
