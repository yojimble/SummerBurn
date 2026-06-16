import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { KIND_POSTAGE_COST } from '@/lib/summerBurn';

// Fetches postage costs published by a list of sender anon pubkeys.
// Each sender publishes a kind 31928 event with d-tag = recipientAnonPubkey.
// Returns a map: senderAnonPubkey → cost string (e.g. "£2.50").
export function usePostageCosts(
  senderAnonPubkeys: string[],
  recipientAnonPubkey: string | null,
) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'postage-costs', recipientAnonPubkey ?? '', senderAnonPubkeys.join(',')],
    queryFn: async (c) => {
      if (!recipientAnonPubkey || !senderAnonPubkeys.length) return {};
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query(
        [{
          kinds: [KIND_POSTAGE_COST],
          authors: senderAnonPubkeys,
          '#d': [recipientAnonPubkey],
        }],
        { signal },
      );

      const result: Record<string, string> = {};
      for (const ev of events.sort((a, b) => b.created_at - a.created_at)) {
        if (!result[ev.pubkey] && ev.content.trim()) {
          result[ev.pubkey] = ev.content.trim();
        }
      }
      return result;
    },
    enabled: !!recipientAnonPubkey && senderAnonPubkeys.length > 0,
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
