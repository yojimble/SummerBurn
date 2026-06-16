import { useState, useMemo } from 'react';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { nip19 } from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function storageKey(pubkey: string) {
  return `summerburn2026:anon-nsec:${pubkey}`;
}

export function useAnonIdentity() {
  const { user } = useCurrentUser();
  const key = user ? storageKey(user.pubkey) : null;

  const [anonNsecHex, setAnonNsecHex] = useState<string | null>(
    () => key ? localStorage.getItem(key) : null,
  );

  const anonPubkey = useMemo(() => {
    if (!anonNsecHex) return null;
    try {
      return getPublicKey(hexToBytes(anonNsecHex));
    } catch {
      return null;
    }
  }, [anonNsecHex]);

  const anonNpub = useMemo(
    () => (anonPubkey ? nip19.npubEncode(anonPubkey) : null),
    [anonPubkey],
  );

  const anonNsecBech32 = useMemo(() => {
    if (!anonNsecHex) return null;
    try {
      return nip19.nsecEncode(hexToBytes(anonNsecHex));
    } catch {
      return null;
    }
  }, [anonNsecHex]);

  const generate = (): string => {
    const keyBytes = generateSecretKey();
    const hex = bytesToHex(keyBytes);
    if (key) localStorage.setItem(key, hex);
    setAnonNsecHex(hex);
    return hex;
  };

  const restore = (nsecHex: string) => {
    if (key) localStorage.setItem(key, nsecHex);
    setAnonNsecHex(nsecHex);
  };

  return { anonNsecHex, anonPubkey, anonNpub, anonNsecBech32, generate, restore };
}
