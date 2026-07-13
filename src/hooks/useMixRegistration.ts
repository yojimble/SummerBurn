import { finalizeEvent, generateSecretKey, nip44 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { ORGANIZER_PUBKEY } from '@/lib/summerBurn';
import { hexToBytes } from '@/lib/utils';

interface AnonIdentity {
  anonNsecHex: string | null;
  anonPubkey: string | null;
  anonNpub: string | null;
}

export function useMixRegistration({ anonNsecHex, anonPubkey, anonNpub }: AnonIdentity) {
  const { nostr } = useNostr();

  const sendMixDM = async (content: string) => {
    if (!anonNsecHex || !anonPubkey) throw new Error('No anon identity');
    const privkey = hexToBytes(anonNsecHex);

    const rumor = {
      kind: 14,
      content,
      tags: [['p', ORGANIZER_PUBKEY]],
      created_at: Math.floor(Date.now() / 1000),
      pubkey: anonPubkey,
    };
    const { getEventHash } = await import('nostr-tools/pure');
    (rumor as any).id = getEventHash(rumor as any);

    const sealContent = nip44.v2.encrypt(JSON.stringify(rumor), nip44.v2.utils.getConversationKey(privkey, ORGANIZER_PUBKEY));
    const seal = finalizeEvent({ kind: 13, content: sealContent, tags: [], created_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 172800) }, privkey);

    const wrapKey = generateSecretKey();
    const wrapContent = nip44.v2.encrypt(JSON.stringify(seal), nip44.v2.utils.getConversationKey(wrapKey, ORGANIZER_PUBKEY));
    const wrap = finalizeEvent({ kind: 1059, content: wrapContent, tags: [['p', ORGANIZER_PUBKEY]], created_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 172800) }, wrapKey);

    await nostr.event(wrap, { signal: AbortSignal.timeout(15000) });

    // Relays can reply OK without durably storing the event, so confirm it's
    // actually retrievable before treating the send as successful.
    const confirmed = await nostr.query(
      [{ ids: [wrap.id] }],
      { signal: AbortSignal.timeout(10000) },
    );
    if (!confirmed.some(e => e.id === wrap.id)) {
      throw new Error('Relay accepted the event but it could not be confirmed on re-query');
    }
  };

  const sendAdd = () => sendMixDM(`ADD ${anonNpub}`);
  const sendRemove = () => sendMixDM(`REMOVE ${anonNpub}`);

  return { sendAdd, sendRemove, hasAnonIdentity: !!anonNsecHex };
}
