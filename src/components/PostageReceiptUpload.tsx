import { useRef, useState } from 'react';
import { finalizeEvent } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/useToast';
import { useUploadFile } from '@/hooks/useUploadFile';
import { hexToBytes } from '@/lib/utils';
import { KIND_POSTAGE_RECEIPT } from '@/lib/summerBurn';

interface PostageReceiptUploadProps {
  recipientAnonPubkey: string;
  anonNsecHex: string;
  existingUrl?: string;
}

export function PostageReceiptUpload({ recipientAnonPubkey, anonNsecHex, existingUrl }: PostageReceiptUploadProps) {
  const { nostr } = useNostr();
  const { mutateAsync: uploadFile } = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsPending(true);
    try {
      const tags = await uploadFile(file);
      const urlTag = tags.find(t => t[0] === 'url');
      const imageUrl = urlTag?.[1];
      if (!imageUrl) throw new Error('Upload failed — no URL returned');

      const event = finalizeEvent(
        {
          kind: KIND_POSTAGE_RECEIPT,
          created_at: Math.floor(Date.now() / 1000),
          tags: [['d', recipientAnonPubkey]],
          content: imageUrl,
        },
        hexToBytes(anonNsecHex),
      );

      await nostr.event(event, { signal: AbortSignal.timeout(5000) });

      toast({ title: 'Receipt uploaded', description: 'Your recipient can now see proof of postage.' });
      setOpen(false);
      setFile(null);
      setPreview(null);
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message ?? 'Please try again.' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {existingUrl ? '📬 Update receipt' : '📬 Upload receipt'}
      </Button>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setFile(null); setPreview(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload postage receipt</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Take a photo of your proof of postage and upload it here. Your recipient will see it as confirmation their CD is on the way.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {preview ? (
            <div className="space-y-3">
              <img src={preview} alt="Receipt preview" className="w-full rounded-lg object-contain max-h-64 bg-muted" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1">
                  Change photo
                </Button>
                <Button onClick={handleUpload} disabled={isPending} className="flex-1">
                  {isPending ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-24 border-dashed">
              📷 Take photo / choose file
            </Button>
          )}

          {existingUrl && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Current receipt:</p>
              <img src={existingUrl} alt="Current receipt" className="w-full rounded-lg object-contain max-h-32 bg-muted" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
