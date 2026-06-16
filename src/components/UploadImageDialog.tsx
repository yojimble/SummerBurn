import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/useToast';
import { HASHTAG } from '@/lib/summerBurn';
import { Upload, ImageIcon } from 'lucide-react';

export function UploadImageDialog() {
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { mutateAsync: publish, isPending: isPublishing } = useNostrPublish();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPending = isUploading || isPublishing;

  const handleFile = (f: File) => {
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) handleFile(f);
  };

  const reset = () => {
    setCaption('');
    setPreview(null);
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    try {
      const uploadTags = await uploadFile(file);
      const url = uploadTags.find(([name]) => name === 'url')?.[1];
      if (!url) throw new Error('No URL returned from upload');

      const tags: string[][] = [
        ...uploadTags,
        ['t', HASHTAG],
      ];

      await publish({ kind: 20, content: caption.trim(), tags });
      queryClient.invalidateQueries({ queryKey: ['summerburn', 'gallery'] });
      toast({ title: 'Artwork shared! 🎨', description: 'Your cover art is now in the gallery.' });
      reset();
      setOpen(false);
    } catch {
      toast({ title: 'Upload failed', description: 'Something went wrong. Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Artwork
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Cover Art</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-52 mx-auto rounded object-contain"
              />
            ) : (
              <div className="space-y-2 py-4">
                <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Click or drag to add an image</p>
                <p className="text-xs text-muted-foreground">Your CD cover art goes here</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              placeholder="What's on your Bitcoin Summer Burn mix? Any notes about the artwork?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            disabled={!file || isPending}
            onClick={handleSubmit}
          >
            {isUploading ? 'Uploading image…' : isPublishing ? 'Publishing to Nostr…' : 'Share to Gallery'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
