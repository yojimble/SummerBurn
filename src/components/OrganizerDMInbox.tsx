import { useMixMessages } from '@/hooks/useMixMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OrganizerDMInbox() {
  const { data: messages, isLoading } = useMixMessages();

  const other = messages?.filter(m => !m.content.startsWith('ADD ') && !m.content.startsWith('REMOVE ')) ?? [];

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">DM Inbox ({other.length})</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {isLoading && <p className="text-sm text-muted-foreground">Decrypting messages…</p>}
        {!isLoading && other.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
        {other.map(m => (
          <p key={m.id} className="font-mono text-xs break-all bg-muted p-1.5 rounded">{m.content}</p>
        ))}
      </CardContent>
    </Card>
  );
}
