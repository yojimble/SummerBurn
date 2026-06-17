import { useState } from 'react';
import { useNostr } from '@nostrify/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRSVPs } from '@/hooks/useRSVPs';
import { useSendDM } from '@/hooks/useSendDM';
import { toast } from '@/hooks/useToast';
import { SWAP_STATUS_EVENT_ID, REACTION_CD_POSTED } from '@/lib/summerBurn';

const REMINDER_MESSAGE = `Hey Burner! 🔥 Just a nudge from the Bitcoin Summer Burn organiser — if you haven't posted your CDs yet, now's the time. Try to get them in the post as soon as you can so your recipients aren't left waiting. Thanks for being part of the swap! 📀`;

export function OrganizerTools() {
  const { nostr } = useNostr();
  const { data: rsvps } = useRSVPs();
  const { mutateAsync: sendDM } = useSendDM();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: number } | null>(null);

  const handleSendReminders = async () => {
    if (!rsvps?.pubkeys.size) return;
    setSending(true);
    setResult(null);
    try {
      const rsvpedPubkeys = [...rsvps.pubkeys];

      // Fetch who has already posted
      const postedEvents = await nostr.query(
        [{ kinds: [7], authors: rsvpedPubkeys, '#e': [SWAP_STATUS_EVENT_ID], limit: 1000 }],
        { signal: AbortSignal.timeout(5000) },
      );
      const postedPubkeys = new Set(
        postedEvents.filter((e) => e.content === REACTION_CD_POSTED).map((e) => e.pubkey),
      );

      const needsReminder = rsvpedPubkeys.filter((pk) => !postedPubkeys.has(pk));

      let sent = 0;
      for (const pubkey of needsReminder) {
        try {
          await sendDM({ recipientPubkey: pubkey, content: REMINDER_MESSAGE });
          sent++;
        } catch {
          // skip failures silently
        }
      }

      setResult({ sent, skipped: postedPubkeys.size });
      toast({ title: `Reminders sent to ${sent} Burner${sent !== 1 ? 's' : ''}` });
    } catch {
      toast({ title: 'Failed to send reminders', description: 'Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const notPostedCount = rsvps ? rsvps.count - (result?.skipped ?? 0) : null;

  return (
    <Card className="border-orange-500/40">
      <CardHeader>
        <CardTitle className="text-base">🔧 Organiser Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{rsvps?.count ?? '…'} RSVPed Burners</p>
          {result && (
            <p>{result.skipped} already posted · {result.sent} reminded</p>
          )}
        </div>
        <Button
          variant="outline"
          className="w-full border-orange-500/60 text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
          disabled={sending || !rsvps?.count}
          onClick={handleSendReminders}
        >
          {sending ? 'Sending reminders…' : '📨 Send CD reminder DMs'}
        </Button>
        {sending && notPostedCount && (
          <p className="text-xs text-muted-foreground text-center">
            This may take a moment — sending to {notPostedCount} Burner{notPostedCount !== 1 ? 's' : ''}…
          </p>
        )}
      </CardContent>
    </Card>
  );
}
