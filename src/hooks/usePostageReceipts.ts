import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { KIND_POSTAGE_RECEIPT } from '@/lib/summerBurn';

// Fetches receipt image URLs published by sender anon pubkeys for a given recipient.
// Returns a map: senderAnonPubkey → image URL.
export function usePostageReceipts(
  senderAnonPubkeys: string[],
  recipientAnonPubkey: string | null,
) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['summerburn', 'postage-receipts', recipientAnonPubkey ?? '', senderAnonPubkeys.join(',')],
    queryFn: async (c) => {
      if (!recipientAnonPubkey || !senderAnonPubkeys.length) return {};
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query(
        [{
          kinds: [KIND_POSTAGE_RECEIPT],
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
